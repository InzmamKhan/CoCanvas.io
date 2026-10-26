const WebSocket = require('ws');
const Room = require('../models/room.model');
const memoryStore = require('../services/memoryStore');
const mongoose = require('mongoose');

const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * WebSocket Room and Connection Manager
 * Requirements:
 * 1. At max 5 people can join the room.
 * 2. When the leader/creator leaves the room, the room must be destroyed in 10 seconds.
 * 3. Realtime white board sketch canvas synchronizing shapes, freehand strokes, text, undo, redo, clear.
 */
class WebSocketService {
  constructor() {
    this.rooms = new Map();
    // Map structure:
    // roomid -> {
    //   roomname: string,
    //   hostid: string,
    //   clients: Map<userid, { ws, username, isHost }>,
    //   canvasState: Array<elements>,
    //   destructionTimer: NodeJS.Timeout | null,
    //   countdownSeconds: number
    // }
  }

  init(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      let currentRoomId = null;
      let currentUser = null;

      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          const { type, payload } = message;

          switch (type) {
            case 'JOIN_ROOM':
              await this.handleJoinRoom(ws, payload, (roomId, user) => {
                currentRoomId = roomId;
                currentUser = user;
              });
              break;

            case 'DRAW_STEP':
              this.handleDrawStep(currentRoomId, currentUser, payload);
              break;

            case 'DRAW_BATCH':
              this.handleDrawBatch(currentRoomId, currentUser, payload);
              break;

            case 'SYNC_CANVAS':
              this.handleSyncCanvas(currentRoomId, currentUser, payload);
              break;

            case 'CURSOR_MOVE':
              this.handleCursorMove(currentRoomId, currentUser, payload);
              break;

            case 'CLEAR_CANVAS':
              this.handleClearCanvas(currentRoomId, currentUser);
              break;

            case 'CHAT_MESSAGE':
              this.handleChatMessage(currentRoomId, currentUser, payload);
              break;

            default:
              console.log('Unknown message type:', type);
          }
        } catch (err) {
          console.error('WebSocket message parsing error:', err.message);
          this.sendToWs(ws, { type: 'ERROR', payload: { message: 'Invalid message payload' } });
        }
      });

      ws.on('close', () => {
        if (currentRoomId && currentUser) {
          this.handleClientDisconnect(currentRoomId, currentUser.userid);
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket client error:', err.message);
      });
    });

    // Heartbeat check every 30s to clean dead sockets
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log('⚡ WebSocket service initialized successfully');
  }

  async handleJoinRoom(ws, payload, setSession) {
    const { roomid, userid, username } = payload;
    if (!roomid || !userid || !username) {
      return this.sendToWs(ws, {
        type: 'ERROR',
        payload: { message: 'Missing roomid, userid, or username' }
      });
    }

    const cleanRoomId = roomid.trim().toUpperCase();

    // Check if room exists in active cache or Database
    let room = this.rooms.get(cleanRoomId);

    if (!room) {
      let dbRoom = null;
      if (isMongoConnected()) {
        dbRoom = await Room.findOne({ roomid: cleanRoomId });
      } else {
        dbRoom = memoryStore.findRoomById(cleanRoomId);
      }

      if (!dbRoom) {
        return this.sendToWs(ws, {
          type: 'ROOM_NOT_FOUND',
          payload: { message: 'Room does not exist or has already been closed.' }
        });
      }

      // Initialize room session in memory
      room = {
        roomid: cleanRoomId,
        roomname: dbRoom.roomname,
        hostid: dbRoom.roomHostid,
        clients: new Map(),
        canvasState: dbRoom.canvasState || [],
        destructionTimer: null,
        destructionCountdown: 10
      };
      this.rooms.set(cleanRoomId, room);
    }

    // Check Max 5 People Capacity Rule
    // If the user is already in the room (e.g. reconnect/refresh), don't treat as a 6th person
    const isAlreadyMember = room.clients.has(userid);
    if (!isAlreadyMember && room.clients.size >= 5) {
      return this.sendToWs(ws, {
        type: 'ROOM_FULL',
        payload: { message: 'This room has reached its maximum capacity of 5 participants.' }
      });
    }

    const isHost = room.hostid === userid;

    // If host reconnected while a destruction timer was ticking, cancel destruction!
    if (isHost && room.destructionTimer) {
      clearTimeout(room.destructionTimer);
      room.destructionTimer = null;
      this.broadcast(cleanRoomId, {
        type: 'DESTRUCTION_CANCELLED',
        payload: { message: 'Room Leader reconnected. Destruction sequence cancelled.' }
      });
    }

    // Register client in room
    room.clients.set(userid, {
      ws,
      userid,
      username,
      isHost
    });

    setSession(cleanRoomId, { userid, username, isHost });

    // Send JOIN_SUCCESS to the joining client with existing canvas state and member list
    this.sendToWs(ws, {
      type: 'JOIN_SUCCESS',
      payload: {
        roomid: cleanRoomId,
        roomname: room.roomname,
        hostid: room.hostid,
        isHost,
        canvasState: room.canvasState,
        members: this.getRoomMembers(cleanRoomId)
      }
    });

    // Notify others in room
    this.broadcast(
      cleanRoomId,
      {
        type: 'USER_JOINED',
        payload: {
          user: { userid, username, isHost },
          members: this.getRoomMembers(cleanRoomId)
        }
      },
      userid
    );
  }

  handleDrawStep(roomid, user, payload) {
    const room = this.rooms.get(roomid);
    if (!room) return;

    // If a completed shape/stroke element is sent, append to canvasState
    if (payload && payload.element) {
      room.canvasState.push(payload.element);
      // Asynchronously persist
      this.persistCanvasState(roomid, room.canvasState);
    }

    // Broadcast drawing action to all other peers
    this.broadcast(
      roomid,
      {
        type: 'REMOTE_DRAW_STEP',
        payload: {
          ...payload,
          senderId: user ? user.userid : null
        }
      },
      user ? user.userid : null
    );
  }

  handleDrawBatch(roomid, user, payload) {
    const room = this.rooms.get(roomid);
    if (!room) return;

    if (payload && Array.isArray(payload.elements)) {
      room.canvasState = payload.elements;
      this.persistCanvasState(roomid, room.canvasState);
    }

    this.broadcast(
      roomid,
      {
        type: 'REMOTE_DRAW_BATCH',
        payload: {
          elements: room.canvasState,
          senderId: user ? user.userid : null
        }
      },
      user ? user.userid : null
    );
  }

  handleSyncCanvas(roomid, user, payload) {
    const room = this.rooms.get(roomid);
    if (!room) return;

    if (payload && Array.isArray(payload.canvasState)) {
      room.canvasState = payload.canvasState;
      this.persistCanvasState(roomid, room.canvasState);

      this.broadcast(
        roomid,
        {
          type: 'CANVAS_SYNCED',
          payload: {
            canvasState: room.canvasState,
            senderId: user ? user.userid : null
          }
        },
        user ? user.userid : null
      );
    }
  }

  handleClearCanvas(roomid, user) {
    const room = this.rooms.get(roomid);
    if (!room) return;

    room.canvasState = [];
    this.persistCanvasState(roomid, []);

    this.broadcast(roomid, {
      type: 'CANVAS_CLEARED',
      payload: {
        clearedBy: user ? user.username : 'User'
      }
    });
  }

  handleCursorMove(roomid, user, payload) {
    if (!roomid || !user) return;
    this.broadcast(
      roomid,
      {
        type: 'REMOTE_CURSOR',
        payload: {
          userid: user.userid,
          username: user.username,
          x: payload.x,
          y: payload.y
        }
      },
      user.userid
    );
  }

  handleChatMessage(roomid, user, payload) {
    if (!roomid || !user) return;
    this.broadcast(roomid, {
      type: 'CHAT_MESSAGE',
      payload: {
        id: Date.now() + Math.random().toString(36).substring(2, 5),
        senderId: user.userid,
        senderName: user.username,
        text: payload.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });
  }

  handleClientDisconnect(roomid, userid) {
    const room = this.rooms.get(roomid);
    if (!room) return;

    const member = room.clients.get(userid);
    const wasHost = member ? member.isHost : false;
    const memberName = member ? member.username : 'Participant';

    room.clients.delete(userid);

    // Notify other members
    this.broadcast(roomid, {
      type: 'USER_LEFT',
      payload: {
        userid,
        username: memberName,
        wasHost,
        members: this.getRoomMembers(roomid)
      }
    });

    // Requirement: When the leader/creator leaves the room, the room must be destroyed in 10 seconds.
    if (wasHost) {
      console.log(`⚠️ Room Host left ${roomid}. Starting 10-second destruction timer...`);

      let secondsLeft = 10;
      this.broadcast(roomid, {
        type: 'ROOM_DESTRUCTION_WARNING',
        payload: {
          secondsLeft,
          message: 'The room creator/leader has left! The room will be permanently destroyed in 10 seconds.'
        }
      });

      const interval = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          this.broadcast(roomid, {
            type: 'ROOM_DESTRUCTION_TICK',
            payload: { secondsLeft }
          });
        } else {
          clearInterval(interval);
        }
      }, 1000);

      room.destructionTimer = setTimeout(async () => {
        clearInterval(interval);
        await this.destroyRoom(roomid);
      }, 10000);
    } else {
      // If regular user left and room is empty and host had left previously, clean up
      if (room.clients.size === 0 && !room.destructionTimer) {
        this.rooms.delete(roomid);
      }
    }
  }

  async destroyRoom(roomid) {
    const room = this.rooms.get(roomid);
    if (!room) return;

    console.log(`💥 Destroying room ${roomid}...`);

    // Notify all remaining clients to disconnect and redirect home
    this.broadcast(roomid, {
      type: 'ROOM_DESTROYED',
      payload: {
        message: 'This room has been destroyed because the leader left.'
      }
    });

    // Close all remaining client connections
    for (const client of room.clients.values()) {
      try {
        client.ws.close(1000, 'Room destroyed');
      } catch (e) {}
    }

    // Delete from memory and database
    this.rooms.delete(roomid);
    memoryStore.deleteRoom(roomid);

    if (isMongoConnected()) {
      try {
        await Room.deleteOne({ roomid });
        console.log(`🗑️ Room ${roomid} deleted from MongoDB.`);
      } catch (err) {
        console.error('Error deleting room from DB:', err.message);
      }
    }
  }

  getRoomMembers(roomid) {
    const room = this.rooms.get(roomid);
    if (!room) return [];
    return Array.from(room.clients.values()).map((c) => ({
      userid: c.userid,
      username: c.username,
      isHost: c.isHost
    }));
  }

  broadcast(roomid, message, excludeUserId = null) {
    const room = this.rooms.get(roomid);
    if (!room) return;

    const data = JSON.stringify(message);
    for (const [uid, client] of room.clients.entries()) {
      if (excludeUserId && uid === excludeUserId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  sendToWs(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  async persistCanvasState(roomid, canvasState) {
    memoryStore.updateCanvas(roomid, canvasState);
    if (isMongoConnected()) {
      try {
        await Room.updateOne({ roomid }, { $set: { canvasState } });
      } catch (e) {
        console.error('Failed to update canvas in DB:', e.message);
      }
    }
  }
}

const webSocketService = new WebSocketService();
module.exports = webSocketService;

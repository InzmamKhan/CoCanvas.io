/**
 * MemoryStore provides a high-reliability fallback store when MONGODB_URI is not yet configured,
 * ensuring seamless local development and testing before MongoDB Atlas credentials are provided.
 */
class MemoryStore {
  constructor() {
    this.users = new Map(); // key: userid, value: user doc
    this.rooms = new Map(); // key: roomid, value: room doc
  }

  // User Operations
  findUserByUsername(username) {
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === username.toLowerCase()) return u;
    }
    return null;
  }

  findUserByEmail(email) {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  findUserById(userid) {
    return this.users.get(userid) || null;
  }

  saveUser(userData) {
    this.users.set(userData.userid, userData);
    return userData;
  }

  // Room Operations
  findRoomById(roomid) {
    return this.rooms.get(roomid) || null;
  }

  saveRoom(roomData) {
    this.rooms.set(roomData.roomid, { ...roomData });
    return this.rooms.get(roomData.roomid);
  }

  deleteRoom(roomid) {
    return this.rooms.delete(roomid);
  }

  updateCanvas(roomid, elements) {
    const room = this.rooms.get(roomid);
    if (room) {
      room.canvasState = elements;
    }
  }
}

const memoryStore = new MemoryStore();
module.exports = memoryStore;

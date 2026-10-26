const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

export class CanvasSocket {
  constructor(roomid, user, onMessageCallback, onStatusCallback) {
    this.roomid = roomid;
    this.user = user;
    this.onMessageCallback = onMessageCallback;
    this.onStatusCallback = onStatusCallback;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isManualClose = false;
  }

  connect() {
    this.isManualClose = false;
    this.updateStatus('CONNECTING');

    const wsUrl = `${WS_BASE_URL}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.updateStatus('CONNECTED');

      // Send JOIN_ROOM message immediately upon connection
      this.send('JOIN_ROOM', {
        roomid: this.roomid,
        userid: this.user.userid,
        username: this.user.username
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(data);
        }
      } catch (err) {
        console.error('WebSocket incoming message parse error:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket encountered an error:', error);
      this.updateStatus('ERROR');
    };

    this.ws.onclose = (event) => {
      if (this.isManualClose) {
        this.updateStatus('DISCONNECTED');
        return;
      }

      this.updateStatus('DISCONNECTED');
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts += 1;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
        setTimeout(() => this.connect(), delay);
      }
    };
  }

  updateStatus(status) {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
    }
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('Cannot send WS message, socket not OPEN. State:', this.ws?.readyState);
    }
  }

  // Action helpers
  sendDrawStep(element) {
    this.send('DRAW_STEP', { element });
  }

  sendDrawBatch(elements) {
    this.send('DRAW_BATCH', { elements });
  }

  sendSyncCanvas(canvasState) {
    this.send('SYNC_CANVAS', { canvasState });
  }

  sendClearCanvas() {
    this.send('CLEAR_CANVAS', {});
  }

  sendCursorMove(x, y) {
    this.send('CURSOR_MOVE', { x, y });
  }

  sendChatMessage(text) {
    this.send('CHAT_MESSAGE', { text });
  }

  disconnect() {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.tokenKey = 'cocanvas_auth_token';
    this.userKey = 'cocanvas_auth_user';
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  getUser() {
    const raw = localStorage.getItem(this.userKey);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setUser(user) {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth Endpoints
  async register(username, email, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    if (data.token) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  }

  async login(emailOrUsername, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password })
    });
    if (data.token) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  }

  async getMe() {
    return await this.request('/api/auth/me');
  }

  // Room Endpoints
  async createRoom(roomname, isPrivate) {
    return await this.request('/api/rooms/create', {
      method: 'POST',
      body: JSON.stringify({ roomname, isPrivate })
    });
  }

  async joinRoomCheck(roomid, roomname, password) {
    return await this.request('/api/rooms/join-check', {
      method: 'POST',
      body: JSON.stringify({ roomid, roomname, password })
    });
  }

  async getRoomDetails(roomid) {
    return await this.request(`/api/rooms/${roomid}`);
  }
}

export const api = new ApiService();

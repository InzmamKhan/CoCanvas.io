# CoCanvas.io 🎨

**CoCanvas.io** is a real-time collaborative whiteboard sketch canvas designed for teams of up to 5 concurrent participants. Built with a **White Neumorphic Minimal** design aesthetic, it synchronizes canvas actions instantly over WebSockets.

---

## 🏛️ Architecture & MVC Structure

```
CoCanvas.io/
├── .gitignore                     # Root gitignore configured for node_modules, dist, .env
├── backend/                       # Backend service (Node.js + Express + WebSockets + MongoDB)
│   ├── .env                       # Environment variables (spaces formatted for easy filling)
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── db.js              # MongoDB Atlas connection (with seamless memory fallback)
│       ├── models/
│       │   ├── user.model.js      # User Schema (userid, username, email, password)
│       │   └── room.model.js      # Room Schema (roomid, roomname, roomHostid, roomCreatedOnDate, roomCreatedOnTime)
│       ├── controllers/
│       │   ├── auth.controller.js  # Registration, Unique userid generation, Login
│       │   └── room.controller.js  # Room creation, 5-digit password generator, Join verification
│       ├── middlewares/
│       │   └── auth.middleware.js # JWT Bearer Token validation
│       ├── routes/
│       │   ├── auth.routes.js
│       │   └── room.routes.js
│       ├── services/
│       │   ├── websocket.service.js # 5-user capacity check, canvas sync, 10-second host departure destruction timer
│       │   └── memoryStore.js     # In-memory store fallback for offline/development
│       └── server.js              # HTTP server & WebSocket gateway
│
└── frontend/                      # Frontend SPA (React 18 + Vite)
    ├── .env                       # Frontend environment variables
    ├── .env.example
    ├── index.html                 # Inter & Plus Jakarta Sans typography
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── styles/
        │   └── neumorphic.css     # White neumorphic shadows, inset inputs, soft curves
        ├── services/
        │   ├── api.js             # HTTP REST API client
        │   ├── AuthContext.jsx    # Session & Authentication provider
        │   └── websocket.js       # Real-time WebSocket connection manager
        ├── components/
        │   ├── AuthModal.jsx      # Account creation & Sign-in modal
        │   ├── CreateRoomModal.jsx# Public / Private room creator with 5-digit password generator
        │   └── JoinRoomModal.jsx  # Join room modal with Room ID & Room Name verification
        ├── pages/
        │   ├── HomePage.jsx       # 10-item greeting array header + Create / Join Room cards
        │   └── CanvasRoomPage.jsx # MS Paint whiteboard canvas (Pencil, Brush, Eraser, Shapes, Text, Undo/Redo)
        ├── App.jsx
        └── main.jsx
```

---

## 🚀 Deployment Instructions

### 1. Database: MongoDB Atlas
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and whitelist network access (`0.0.0.0/0` for cloud services).
3. Copy your connection string into `backend/.env`:
   ```env
   MONGODB_URI = mongodb+srv://<username>:<password>@cluster.mongodb.net/cocanvas?retryWrites=true&w=majority
   ```

### 2. Backend: Deploy to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Set **Root Directory** to `backend`.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Under **Environment Variables**, set:
   - `PORT`: `10000` (or leave default, Render sets this automatically)
   - `MONGODB_URI`: `<your_atlas_connection_string>`
   - `JWT_SECRET`: `<your_jwt_secret>`
   - `CLIENT_URL`: `https://your-frontend.vercel.app`

### 3. Frontend: Deploy to Vercel
1. Import the repository in [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Under **Environment Variables**, set:
   - `VITE_API_URL`: `https://your-backend.onrender.com`
   - `VITE_WS_URL`: `wss://your-backend.onrender.com`
5. Click **Deploy**.

---

## 💻 Local Development

### Start Backend
```bash
cd backend
npm install
npm run dev
```

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

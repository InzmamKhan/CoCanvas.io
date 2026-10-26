require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const webSocketService = require('./services/websocket.service');

const app = express();
const server = http.createServer(app);

// Initialize Database Connection
connectDB();

// Middlewares
app.use(cors({
  origin: '*', // Allow Vercel frontend and local development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'CoCanvas.io Backend'
  });
});

// MVC Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Initialize Realtime WebSocket Service
webSocketService.init(server);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 CoCanvas Backend server running on port ${PORT}`);
  console.log(`🎨 WebSockets listening on port ${PORT}`);
});

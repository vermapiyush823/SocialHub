require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { connectDB, connectRedis } = require('./config/db');
const registerSocketHandlers = require('./socketHandlers');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

// Connect to Redis
const redisClient = connectRedis();

const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach Redis adapter if available
if (redisClient) {
  const subClient = redisClient.duplicate();
  Promise.all([redisClient.ping(), subClient.ping()]).then(() => {
    io.adapter(createAdapter(redisClient, subClient));
    console.log('✅ Redis Adapter for Socket.io enabled');
  }).catch(err => {
    console.warn('⚠️ Socket.io running without Redis Adapter:', err.message);
  });
}

// Register socket handlers
registerSocketHandlers(io, redisClient);

// ─── API Routes ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', app: 'SocialHub', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', require('./routes/chat'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/matrimony', require('./routes/matrimony'));

// ─── Error handling middleware ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 SocialHub API running on port ${PORT}`);
});

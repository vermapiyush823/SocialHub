const mongoose = require('mongoose');
const Redis = require('ioredis');

let redisClient = null;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/socialhub';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Seed Global Chat
    const Chat = require('../models/Chat');
    const globalChat = await Chat.findOne({ isGlobal: true });
    if (!globalChat) {
      await Chat.create({
        isGroup: true,
        isGlobal: true,
        groupName: 'Global Chat',
        description: 'Welcome to the global chat! Everyone is here.',
        joinMode: 'public',
        participants: []
      });
      console.log('✅ Global Chat seeded');
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const connectRedis = () => {
  if (!process.env.REDIS_URI) {
    console.log('ℹ️  No REDIS_URI set — running without Redis (single-node mode)');
    return null;
  }
  try {
    redisClient = new Redis(process.env.REDIS_URI, { maxRetriesPerRequest: 3, retryStrategy: (times) => times > 3 ? null : Math.min(times * 200, 2000) });
    redisClient.on('connect', () => console.log('✅ Connected to Redis'));
    redisClient.on('error', (err) => console.warn('⚠️ Redis error:', err.message));
    return redisClient;
  } catch (err) {
    console.warn('⚠️ Could not connect to Redis:', err.message);
    return null;
  }
};

const getRedisClient = () => redisClient;

module.exports = { connectDB, connectRedis, getRedisClient };

const Message = require('./models/Message');
const Chat = require('./models/Chat');
const { verifyToken } = require('./utils/jwt');
const User = require('./models/User');

module.exports = (io, redisClient) => {

  // Middleware: Authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('name profilePicPublicId profilePicUrl');
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.userName = user.name;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`⚡ ${socket.userName} connected (${socket.id})`);

    // Join a personal room for targeted messages
    socket.join(`user:${userId}`);

    // Set online status
    if (redisClient) {
      await redisClient.setex(`presence:${userId}`, 120, 'online');
    }
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    io.emit('user_status', { userId, status: 'online' });

    // ─── Join all user's chat rooms ──────────────────────
    socket.on('join_chats', async () => {
      try {
        const chats = await Chat.find({
          $or: [
            { participants: userId },
            { isGlobal: true }
          ]
        }).select('_id');
        chats.forEach(chat => {
          socket.join(`chat:${chat._id}`);
        });
        console.log(`📂 ${socket.userName} joined ${chats.length} chat rooms (including global)`);
      } catch (err) {
        console.error('Join chats error:', err);
      }
    });

    // ─── Join a specific chat room ───────────────────────
    socket.on('join_chat', ({ chatId }) => {
      socket.join(`chat:${chatId}`);
    });

    // ─── Send a message ─────────────────────────────────
    socket.on('send_message', async (data, callback) => {
      const { chatId, content, type = 'text', mediaUrl = '', replyTo = null } = data;
      try {
        // Save message
        const message = new Message({
          chatId,
          senderId: userId,
          content,
          type,
          mediaUrl,
          replyTo,
          status: 'sent',
          readBy: [userId],
        });
        await message.save();
        await message.populate('senderId', 'name profilePicPublicId profilePicUrl');
        if (replyTo) {
          await message.populate('replyTo', 'content senderId');
        }

        // Update chat's lastMessage
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: {
            content: type === 'text' ? content : `📎 ${type}`,
            senderId: userId,
            timestamp: new Date(),
          }
        });

        // Broadcast to chat room
        io.to(`chat:${chatId}`).emit('receive_message', message);

        // Send notification to offline participants (skip if global chat to avoid spam)
        const chat = await Chat.findById(chatId).select('participants isGlobal');
        if (chat && !chat.isGlobal) {
          chat.participants.forEach(pId => {
            const pid = pId.toString();
            if (pid !== userId) {
              io.to(`user:${pid}`).emit('message_notification', {
                chatId,
                message,
              });
            }
          });
        }

        if (callback) callback({ success: true, message });
      } catch (err) {
        console.error('Send message error:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // ─── Typing indicator ────────────────────────────────
    socket.on('typing_start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user_typing', {
        chatId,
        userId,
        userName: socket.userName,
      });
    });

    socket.on('typing_stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user_stop_typing', {
        chatId,
        userId,
      });
    });

    // ─── Mark messages as read ───────────────────────────
    socket.on('mark_read', async ({ chatId }) => {
      try {
        await Message.updateMany(
          {
            chatId,
            senderId: { $ne: userId },
            readBy: { $ne: userId },
          },
          {
            $addToSet: { readBy: userId },
            $set: { status: 'read' },
          }
        );
        // Notify sender their messages were read
        socket.to(`chat:${chatId}`).emit('messages_read', {
          chatId,
          readBy: userId,
        });
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });

    // ─── Heartbeat for presence ──────────────────────────
    socket.on('heartbeat', async () => {
      if (redisClient) {
        await redisClient.setex(`presence:${userId}`, 120, 'online');
      }
    });

    // ─── Check if a user is online ───────────────────────
    socket.on('check_presence', async (targetUserId, callback) => {
      if (redisClient) {
        const status = await redisClient.get(`presence:${targetUserId}`);
        if (callback) callback({ online: status === 'online' });
      } else {
        const user = await User.findById(targetUserId).select('isOnline lastSeen');
        if (callback) callback({ online: user?.isOnline || false, lastSeen: user?.lastSeen });
      }
    });

    // ─── Disconnect ──────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔴 ${socket.userName} disconnected`);
      if (redisClient) {
        await redisClient.del(`presence:${userId}`);
      }
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit('user_status', { userId, status: 'offline' });
    });
  });
};

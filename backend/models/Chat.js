const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  isGroup: {
    type: Boolean,
    default: false,
  },
  groupName: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  groupAvatar: {
    type: String,
    default: '',
  },
  isGlobal: {
    type: Boolean,
    default: false,
  },
  joinMode: {
    type: String,
    enum: ['invite_only', 'request_to_join', 'public'],
    default: 'invite_only',
  },
  joinRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  invitedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Index for fast lookup of user's chats
chatSchema.index({ participants: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

module.exports = mongoose.model('Chat', chatSchema);

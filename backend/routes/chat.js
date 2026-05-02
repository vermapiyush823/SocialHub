const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/chat/conversations — List all user's conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      $or: [
        { participants: req.user._id },
        { isGlobal: true }
      ]
    })
      .populate('participants', 'name profilePic isOnline lastSeen')
      .populate('lastMessage.senderId', 'name')
      .sort({ 'lastMessage.timestamp': -1 });

    // Format for frontend
    const formatted = chats.map(chat => {
      const otherParticipants = chat.participants.filter(
        p => p._id.toString() !== req.user._id.toString()
      );
      return {
        _id: chat._id,
        isGroup: chat.isGroup,
        groupName: chat.groupName,
        groupAvatar: chat.groupAvatar,
        participants: chat.participants,
        otherUser: chat.isGroup ? null : otherParticipants[0] || null,
        isGlobal: chat.isGlobal,
        description: chat.description,
        joinMode: chat.joinMode,
        admin: chat.admin,
        lastMessage: chat.lastMessage,
        updatedAt: chat.updatedAt,
      };
    });

    res.json({ conversations: formatted });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat/conversations — Create or get existing 1-on-1 chat
router.post('/conversations', auth, async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' });
    }

    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    // Check if participant exists
    const otherUser = await User.findById(participantId);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if 1-on-1 chat already exists
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, participantId], $size: 2 },
    }).populate('participants', 'name profilePic isOnline lastSeen');

    if (chat) {
      return res.json({ conversation: chat, isNew: false });
    }

    // Create new chat
    chat = new Chat({
      participants: [req.user._id, participantId],
      isGroup: false,
    });
    await chat.save();
    await chat.populate('participants', 'name profilePic isOnline lastSeen');

    res.status(201).json({ conversation: chat, isNew: true });
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/chat/:chatId/messages — Get paginated messages for a chat
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify user is participant or it is a global chat
    const chat = await Chat.findOne({
      _id: chatId,
      $or: [
        { participants: req.user._id },
        { isGlobal: true }
      ]
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not a participant of this chat' });
    }

    const query = { chatId, isDeleted: false };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name profilePic')
      .populate('replyTo', 'content senderId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id }, $set: { status: 'read' } }
    );

    res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat/group — Create a group chat
router.post('/group', auth, async (req, res) => {
  try {
    const { name, description, joinMode, participantIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const allParticipants = [req.user._id, ...participantIds];
    // Remove duplicates
    const uniqueParticipants = [...new Set(allParticipants.map(id => id.toString()))];

    const chat = new Chat({
      participants: uniqueParticipants,
      isGroup: true,
      groupName: name,
      description: description || '',
      joinMode: joinMode || 'invite_only',
      admin: req.user._id,
    });
    await chat.save();
    await chat.populate('participants', 'name profilePic isOnline lastSeen');

    res.status(201).json({ conversation: chat });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/chat/groups/discover — List groups available to join
router.get('/groups/discover', auth, async (req, res) => {
  try {
    const groups = await Chat.find({
      isGroup: true,
      isGlobal: false,
      joinMode: { $in: ['request_to_join', 'public'] },
      participants: { $ne: req.user._id },
    }).select('groupName description joinMode groupAvatar admin participants').populate('admin', 'name');
    
    // Map to include a flag if the user has already requested to join
    const formatted = groups.map(g => {
      const obj = g.toObject();
      obj.hasRequested = g.joinRequests && g.joinRequests.includes(req.user._id);
      obj.participantCount = g.participants.length;
      delete obj.participants;
      return obj;
    });

    res.json({ groups: formatted });
  } catch (err) {
    console.error('Discover groups error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat/group/:chatId/request — Request to join a group
router.post('/group/:chatId/request', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.isGroup || chat.isGlobal) {
      return res.status(404).json({ error: 'Valid group not found' });
    }

    if (chat.participants.includes(req.user._id)) {
      return res.status(400).json({ error: 'Already a participant' });
    }

    if (chat.joinMode === 'invite_only') {
      return res.status(403).json({ error: 'This group is invite-only' });
    }

    if (chat.joinMode === 'public') {
      // Join immediately
      chat.participants.push(req.user._id);
      await chat.save();
      return res.json({ success: true, joined: true, chat });
    } else {
      // Request to join
      if (!chat.joinRequests.includes(req.user._id)) {
        chat.joinRequests.push(req.user._id);
        await chat.save();
      }
      return res.json({ success: true, requested: true });
    }
  } catch (err) {
    console.error('Group request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/chat/group/:chatId/requests — Get join requests for a group
router.get('/group/:chatId/requests', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate('joinRequests', 'name profilePic email');
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    
    if (chat.admin?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ requests: chat.joinRequests });
  } catch (err) {
    console.error('Get join requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat/group/:chatId/approve — Approve a join request
router.post('/group/:chatId/approve', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });

    if (chat.admin?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove from joinRequests
    chat.joinRequests = chat.joinRequests.filter(id => id.toString() !== userId);
    
    // Add to participants if not already
    if (!chat.participants.includes(userId)) {
      chat.participants.push(userId);
    }
    
    await chat.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Approve request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat/group/:chatId/reject — Reject a join request
router.post('/group/:chatId/reject', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });

    if (chat.admin?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove from joinRequests
    chat.joinRequests = chat.joinRequests.filter(id => id.toString() !== userId);
    await chat.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat/group/:chatId/invite — Admin invites a user
router.post('/group/:chatId/invite', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found' });

    if (chat.admin?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (chat.participants.includes(userId)) {
      return res.status(400).json({ error: 'User is already a participant' });
    }

    if (!chat.invitedUsers.includes(userId)) {
      chat.invitedUsers.push(userId);
      await chat.save();
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/chat/groups/invitations — Get user's pending invitations
router.get('/groups/invitations', auth, async (req, res) => {
  try {
    const groups = await Chat.find({
      isGroup: true,
      invitedUsers: req.user._id
    }).select('groupName description joinMode groupAvatar admin').populate('admin', 'name');
    
    res.json({ invitations: groups });
  } catch (err) {
    console.error('Get invitations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat/group/:chatId/accept-invite — User accepts an invite
router.post('/group/:chatId/accept-invite', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });

    if (!chat.invitedUsers.includes(req.user._id)) {
      return res.status(400).json({ error: 'No invitation found' });
    }

    // Remove from invitedUsers and add to participants
    chat.invitedUsers = chat.invitedUsers.filter(id => id.toString() !== req.user._id.toString());
    if (!chat.participants.includes(req.user._id)) {
      chat.participants.push(req.user._id);
    }
    await chat.save();
    res.json({ success: true, chat });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat/group/:chatId/decline-invite — User declines an invite
router.post('/group/:chatId/decline-invite', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });

    chat.invitedUsers = chat.invitedUsers.filter(id => id.toString() !== req.user._id.toString());
    await chat.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Decline invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

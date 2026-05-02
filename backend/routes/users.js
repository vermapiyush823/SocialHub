const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/users/:id — Get user profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'name profilePic')
      .populate('following', 'name profilePic');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/profile — Update own profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const allowedFields = ['name', 'bio', 'profilePic'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { 
      new: true, 
      runValidators: true 
    });

    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:id/follow — Toggle follow/unfollow
router.post('/:id/follow', auth, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = req.user.following.includes(targetUser._id);

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: targetUser._id } });
      await User.findByIdAndUpdate(targetUser._id, { $pull: { followers: req.user._id } });
      res.json({ message: 'Unfollowed', isFollowing: false });
    } else {
      // Follow
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: targetUser._id } });
      await User.findByIdAndUpdate(targetUser._id, { $addToSet: { followers: req.user._id } });
      res.json({ message: 'Following', isFollowing: true });
    }
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users — Search users
router.get('/', auth, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const query = q ? { name: { $regex: q, $options: 'i' } } : {};
    
    const users = await User.find(query)
      .select('name email profilePic bio')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/users/:id — Get user profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'name profilePicPublicId profilePicUrl')
      .populate('following', 'name profilePicPublicId profilePicUrl');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const { deleteFromCloudinary } = require('../utils/cloudinary');

// PATCH /api/users/profile — Update own profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const allowedFields = ['name', 'bio', 'profilePicPublicId', 'profilePicUrl'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // If profile picture is being updated, delete the old one from Cloudinary
    if (req.body.profilePicPublicId && req.body.profilePicPublicId !== req.user.profilePicPublicId) {
      if (req.user.profilePicPublicId) {
        await deleteFromCloudinary(req.user.profilePicPublicId);
      }
    }

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


// PATCH /api/users/password — Change password
router.patch('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.authProvider === 'google') {
      return res.status(400).json({ error: 'Google accounts cannot change password here.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/account — Delete own account
router.delete('/account', auth, async (req, res) => {
  try {
    const Post = require('../models/Post');

    // Delete profile pic from Cloudinary
    if (req.user.profilePicPublicId) {
      await deleteFromCloudinary(req.user.profilePicPublicId);
    }

    // Soft-delete user's posts and clean up their media
    const posts = await Post.find({ userId: req.user._id, isDeleted: false });
    for (const post of posts) {
      if (post.media && post.media.length > 0) {
        for (const item of post.media) {
          if (item.publicId) {
            await deleteFromCloudinary(item.publicId, item.type || 'image');
          }
        }
      }
      post.isDeleted = true;
      await post.save();
    }

    // Remove from followers/following lists
    await User.updateMany(
      { followers: req.user._id },
      { $pull: { followers: req.user._id } }
    );
    await User.updateMany(
      { following: req.user._id },
      { $pull: { following: req.user._id } }
    );

    // Delete user
    await User.findByIdAndDelete(req.user._id);

    res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
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
      .select('name email profilePicPublicId profilePicUrl bio')
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

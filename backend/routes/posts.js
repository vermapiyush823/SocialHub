const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// GET /api/posts/feed — Paginated feed (all posts, newest first)
router.get('/feed', auth, async (req, res) => {
  try {
    const { cursor, limit = 10 } = req.query;
    const query = { isDeleted: false };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await Post.find(query)
      .populate('userId', 'name profilePicPublicId profilePicUrl')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) + 1); // Fetch one extra to know if there's more

    const hasMore = posts.length > parseInt(limit);
    if (hasMore) posts.pop();

    const enriched = posts.map(post => ({
      ...post.toObject(),
      isLiked: post.likes.some(id => id.toString() === req.user._id.toString()),
    }));

    res.json({
      posts: enriched,
      hasMore,
      nextCursor: posts.length > 0 ? posts[posts.length - 1].createdAt.toISOString() : null,
    });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/user/:userId — Get posts by a specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId, isDeleted: false })
      .populate('userId', 'name profilePicPublicId profilePicUrl')
      .sort({ createdAt: -1 });

    const enriched = posts.map(post => ({
      ...post.toObject(),
      isLiked: post.likes.some(id => id.toString() === req.user._id.toString()),
    }));

    res.json({ posts: enriched });
  } catch (err) {
    console.error('User posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts — Create a new post
router.post('/', auth, async (req, res) => {
  try {
    const { caption, media } = req.body;

    if (!caption && (!media || media.length === 0)) {
      return res.status(400).json({ error: 'Post must have a caption or media' });
    }

    // Validate each media item has publicId and a valid type
    const validatedMedia = (media || []).map(m => ({
      publicId: m.publicId,
      type: ['image', 'video'].includes(m.type) ? m.type : 'image',
    }));

    const post = new Post({
      userId: req.user._id,
      caption: caption || '',
      media: validatedMedia,
    });
    await post.save();
    await post.populate('userId', 'name profilePicPublicId profilePicUrl');

    res.status(201).json({ post: { ...post.toObject(), isLiked: false } });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/like — Toggle like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userId = req.user._id.toString();
    const isLiked = post.likes.some(id => id.toString() === userId);

    if (isLiked) {
      post.likes.pull(req.user._id);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      post.likes.addToSet(req.user._id);
      post.likesCount = post.likes.length;
    }

    await post.save();

    res.json({
      isLiked: !isLiked,
      likesCount: post.likesCount,
    });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id — Delete own post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    if (!post) {
      return res.status(404).json({ error: 'Post not found or not authorized' });
    }
    post.isDeleted = true;
    await post.save();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

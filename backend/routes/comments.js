const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// GET /api/comments/:postId — Get comments for a post
router.get('/:postId', auth, async (req, res) => {
  try {
    const comments = await Comment.find({
      postId: req.params.postId,
      isDeleted: false,
    })
      .populate('userId', 'name profilePic')
      .sort({ createdAt: 1 })
      .limit(50);

    res.json({ comments });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/comments/:postId — Add a comment
router.post('/:postId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = new Comment({
      postId: req.params.postId,
      userId: req.user._id,
      content: content.trim(),
    });
    await comment.save();
    await comment.populate('userId', 'name profilePic');

    // Increment comment count on post
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    res.status(201).json({ comment, commentsCount: post.commentsCount });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/comments/:commentId — Delete own comment
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      userId: req.user._id,
    });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    comment.isDeleted = true;
    await comment.save();

    // Decrement comment count
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

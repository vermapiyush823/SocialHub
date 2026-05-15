const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  caption: {
    type: String,
    default: '',
    maxlength: 2000,
  },
  media: [{
    publicId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  likesCount: {
    type: Number,
    default: 0,
  },
  commentsCount: {
    type: Number,
    default: 0,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

postSchema.index({ createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);

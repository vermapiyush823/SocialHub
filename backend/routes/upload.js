const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const auth = require('../middleware/auth');

// ─── Upload limits ────────────────────────────────────────────────────────────
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;   // 10 MB
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;  // 100 MB
const VIDEO_MAX_DURATION_SEC = 90;           // 90 seconds

// ─── Image storage ────────────────────────────────────────────────────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'socialhub/images',
    resource_type: 'image',
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
    // Eagerly generate a compressed master; original is kept so transforms work
    eager: [{ quality: 'auto', fetch_format: 'auto' }],
    eager_async: true,
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: IMAGE_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// ─── Video storage ────────────────────────────────────────────────────────────
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'socialhub/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'webm'],
    // Eager transcode to q_auto compressed mp4 on upload (async, non-blocking)
    eager: [{ quality: 'auto', fetch_format: 'auto', format: 'mp4' }],
    eager_async: true,
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: VIDEO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * After a video is uploaded, fetch its metadata from Cloudinary and delete it
 * if it exceeds the max allowed duration. Returns an error string or null.
 */
async function enforceDurationLimit(publicId) {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'video',
      media_metadata: true,
    });
    const duration = result.duration || 0;
    if (duration > VIDEO_MAX_DURATION_SEC) {
      // Delete the asset — it's too long
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      return `Video duration (${Math.ceil(duration)}s) exceeds the ${VIDEO_MAX_DURATION_SEC}s limit.`;
    }
    return null;
  } catch (err) {
    console.error('Duration check error:', err);
    return null; // Don't block upload if metadata check fails
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/upload — Upload a single image
router.post('/image', auth, (req, res, next) => {
  uploadImage.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `Image must be under ${IMAGE_MAX_BYTES / 1024 / 1024} MB.` });
      }
      return res.status(400).json({ error: err.message || 'Image upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // multer-storage-cloudinary puts public_id in req.file.filename
    res.json({
      publicId: req.file.filename,
      type: 'image',
    });
  });
});

// POST /api/upload/video — Upload a single video
router.post('/video', auth, (req, res, next) => {
  uploadVideo.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `Video must be under ${VIDEO_MAX_BYTES / 1024 / 1024} MB.` });
      }
      return res.status(400).json({ error: err.message || 'Video upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const publicId = req.file.filename;

    // Post-upload duration enforcement
    const durationError = await enforceDurationLimit(publicId);
    if (durationError) {
      return res.status(400).json({ error: durationError });
    }

    res.json({
      publicId,
      type: 'video',
    });
  });
});

// POST /api/upload — Legacy single-file route (auto-detect image vs video)
// Kept for backwards compatibility with existing CreatePostModal calls
router.post('/', auth, (req, res) => {
  // Peek at content-type to route to the right handler
  // We'll use the image uploader and fall back to video if the mime doesn't match
  uploadImage.single('file')(req, res, (imgErr) => {
    if (!imgErr && req.file) {
      return res.json({
        publicId: req.file.filename,
        type: 'image',
        // Legacy field so old frontend code doesn't break during migration
        url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${req.file.filename}`,
      });
    }

    // Image upload failed (likely a video) — try video uploader
    uploadVideo.single('file')(req, res, async (vidErr) => {
      if (vidErr) {
        if (vidErr.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: `Video must be under ${VIDEO_MAX_BYTES / 1024 / 1024} MB.` });
        }
        return res.status(400).json({ error: vidErr.message || 'Upload failed.' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const publicId = req.file.filename;
      const durationError = await enforceDurationLimit(publicId);
      if (durationError) {
        return res.status(400).json({ error: durationError });
      }

      res.json({
        publicId,
        type: 'video',
        url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${publicId}`,
      });
    });
  });
});

module.exports = router;

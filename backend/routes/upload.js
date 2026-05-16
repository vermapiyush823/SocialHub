const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToCloudinary, enforceDurationLimit } = require('../utils/cloudinary');
const auth = require('../middleware/auth');

// ─── Upload limits ────────────────────────────────────────────────────────────
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;   // 10 MB (client file)
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;  // 100 MB

// ─── Use memory storage so we control the Cloudinary upload ourselves ─────────
const memImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

const memVideoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VIDEO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});


// POST /api/upload/image
// Compresses + resizes the image AT UPLOAD TIME so the stored asset is small.
//   - Max 2048px on the longest edge (no social feed needs 8K photos)
//   - quality: auto       → Cloudinary picks the best compression level
//   - fetch_format: auto  → stores as WebP/AVIF when possible
router.post('/image', auth, (req, res) => {
  memImageUpload.single('file')(req, res, async (multerErr) => {
    if (multerErr) {
      console.error('Image multer error:', multerErr);
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `Image must be under ${IMAGE_MAX_BYTES / 1024 / 1024} MB.` });
      }
      return res.status(400).json({ error: multerErr.message || 'Image upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'socialhub/images',
        resource_type: 'image',
        // ──── UPLOAD-TIME compression ────
        // These transforms run ONCE at upload, so the stored asset is small.
        transformation: [
          {
            width: 2048,
            height: 2048,
            crop: 'limit',        // never upscale, shrink if larger
            quality: 'auto:good', // aggressive compression with good quality
            fetch_format: 'auto', // auto-pick best format (WebP, AVIF, etc.)
          },
        ],
      });

      console.log(
        `✅ Image uploaded: ${result.public_id} — ` +
        `${(req.file.size / 1024).toFixed(0)} KB → ${(result.bytes / 1024).toFixed(0)} KB ` +
        `(${result.width}×${result.height}, ${result.format})`
      );

      res.json({
        publicId: result.public_id,
        type: 'image',
      });
    } catch (err) {
      console.error('Image upload error:', err);
      res.status(500).json({ error: 'Image upload to Cloudinary failed.' });
    }
  });
});

// POST /api/upload/video
// Compresses video at upload time with q_auto + auto format.
router.post('/video', auth, (req, res) => {
  memVideoUpload.single('file')(req, res, async (multerErr) => {
    if (multerErr) {
      console.error('Video multer error:', multerErr);
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `Video must be under ${VIDEO_MAX_BYTES / 1024 / 1024} MB.` });
      }
      return res.status(400).json({ error: multerErr.message || 'Video upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'socialhub/videos',
        resource_type: 'video',
        // ──── UPLOAD-TIME compression ────
        transformation: [
          {
            quality: 'auto',
            fetch_format: 'mp4',  // normalise to mp4
          },
        ],
      });

      // Enforce duration limit using the duration returned in the upload result
      const durationError = await enforceDurationLimit(result.public_id, result.duration || 0);
      if (durationError) {
        return res.status(400).json({ error: durationError });
      }

      console.log(
        `✅ Video uploaded: ${result.public_id} — ` +
        `${(req.file.size / 1024 / 1024).toFixed(1)} MB → ${(result.bytes / 1024 / 1024).toFixed(1)} MB ` +
        `(${result.format})`
      );

      res.json({
        publicId: result.public_id,
        type: 'video',
      });
    } catch (err) {
      console.error('Video upload error:', err);
      res.status(500).json({ error: 'Video upload to Cloudinary failed.' });
    }
  });
});

// POST /api/upload — Legacy single-file route (auto-detect)
router.post('/', auth, (req, res) => {
  const autoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: VIDEO_MAX_BYTES },
  });

  autoUpload.single('file')(req, res, async (multerErr) => {
    if (multerErr) {
      console.error('Auto upload error:', multerErr);
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File is too large.' });
      }
      return res.status(400).json({ error: multerErr.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const isVideo = req.file.mimetype?.startsWith('video/');

    try {
      const opts = isVideo
        ? {
          folder: 'socialhub/videos',
          resource_type: 'video',
          transformation: [{ quality: 'auto', fetch_format: 'mp4' }],
        }
        : {
          folder: 'socialhub/images',
          resource_type: 'image',
          transformation: [
            { width: 2048, height: 2048, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
          ],
        };

      const result = await uploadToCloudinary(req.file.buffer, opts);

      if (isVideo) {
        const durationError = await enforceDurationLimit(result.public_id, result.duration || 0);
        if (durationError) return res.status(400).json({ error: durationError });
      }

      res.json({
        publicId: result.public_id,
        type: isVideo ? 'video' : 'image',
        // Legacy compat field
        url: result.secure_url,
      });
    } catch (err) {
      console.error('Auto upload error:', err);
      res.status(500).json({ error: 'Upload to Cloudinary failed.' });
    }
  });
});

module.exports = router;

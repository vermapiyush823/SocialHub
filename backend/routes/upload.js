const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const auth = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'socialhub',
    resource_type: 'auto', // Allows both images and videos
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'mp4', 'mov'],
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// POST /api/upload — Upload a single file
router.post('/', auth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({ 
    url: req.file.path, // Cloudinary provides the full URL in req.file.path
    filename: req.file.filename,
    size: req.file.size,
  });
});

// POST /api/upload/multiple — Upload multiple files
router.post('/multiple', auth, upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const files = req.files.map(file => ({
    url: file.path,
    filename: file.filename,
    size: file.size,
  }));

  res.json({ files });
});

module.exports = router;

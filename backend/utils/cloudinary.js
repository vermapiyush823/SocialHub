const cloudinary = require('../config/cloudinary');

const VIDEO_MAX_DURATION_SEC = 90;

/**
 * Upload a buffer to Cloudinary via upload_stream.
 * Returns the Cloudinary response (public_id, bytes, format, etc.)
 */
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
};

/**
 * Check video duration and delete if it exceeds the limit.
 * Takes the duration directly from the upload result to avoid an extra API call.
 */
const enforceDurationLimit = async (publicId, duration) => {
  if (duration > VIDEO_MAX_DURATION_SEC) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    } catch (err) {
      console.error('Failed to delete over-length video:', err);
    }
    return `Video duration (${Math.ceil(duration)}s) exceeds the ${VIDEO_MAX_DURATION_SEC}s limit.`;
  }
  return null;
};

/**
 * Delete an asset from Cloudinary.
 * @param {string} publicId - The public ID of the asset.
 * @param {string} resourceType - The type of resource ('image', 'video', etc.)
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`🗑️ Deleted ${resourceType} from Cloudinary: ${publicId}`, result);
    return result;
  } catch (err) {
    console.error(`Failed to delete ${resourceType} from Cloudinary:`, err);
    throw err;
  }
};

module.exports = {
  uploadToCloudinary,
  enforceDurationLimit,
  deleteFromCloudinary,
};

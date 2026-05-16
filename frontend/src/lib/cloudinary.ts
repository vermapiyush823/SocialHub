/**
 * Cloudinary URL builder
 *
 * All delivery URLs are constructed dynamically on the client — no transformed
 * URLs are stored in the database. The DB only stores the Cloudinary public_id.
 *
 * Transformation cheat-sheet used here:
 *   f_auto  → auto best format (WebP for browsers that support it, etc.)
 *   q_auto  → Cloudinary-optimised quality (balances size vs. quality)
 *   c_limit → resize only if the image is wider than the given width (no upscaling)
 *   c_fill  → crop to exact dimensions, filling the space
 *   g_face  → smart gravity — centres the crop on detected face(s)
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

if (!CLOUD_NAME) {
  console.warn(
    '[cloudinary.ts] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set. ' +
    'Cloudinary URLs will not work until you add it to frontend/.env'
  );
}

const BASE_IMAGE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
const BASE_VIDEO = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload`;

/**
 * Build a Cloudinary image URL with the given transformation string.
 * @param publicId  - Cloudinary public_id (e.g. "socialhub/images/abc123")
 * @param transform - Cloudinary transformation string (e.g. "w_1080,c_limit,f_auto,q_auto")
 */
function buildImageUrl(publicId: string, transform: string): string {
  if (!publicId) return '';
  return `${BASE_IMAGE}/${transform}/${publicId}`;
}

/**
 * Feed post image — large display in the social feed.
 * Transformation: w_1080,c_limit,f_auto,q_auto
 *   - Max width 1080 px, never upscales, auto format & quality
 */
export function getFeedImageUrl(publicId: string): string {
  return buildImageUrl(publicId, 'w_1080,c_limit,f_auto,q_auto');
}

/**
 * Profile picture — square avatar cropped to face.
 * Transformation: w_400,h_400,c_fill,g_face,f_auto,q_auto
 *   - 400 × 400 px, face-aware fill crop, auto format & quality
 */
export function getProfilePicUrl(publicId: string): string {
  return buildImageUrl(publicId, 'w_400,h_400,c_fill,g_face,f_auto,q_auto');
}

/**
 * Large Profile picture — for the main profile section.
 * Transformation: w_600,h_600,c_fill,g_face,f_auto,q_auto
 */
export function getLargeProfilePicUrl(publicId: string): string {
  return buildImageUrl(publicId, 'w_600,h_600,c_fill,g_face,f_auto,q_auto');
}

/**
 * Original/Full image for zoom/preview.
 * Transformation: f_auto,q_auto (no resizing)
 */
export function getOriginalImageUrl(publicId: string): string {
  return buildImageUrl(publicId, 'f_auto,q_auto');
}

/**
 * Thumbnail — compact preview image (e.g. user posts grid, chat preview).
 * Transformation: w_400,f_auto,q_auto
 *   - Max width 400 px, auto format & quality
 */
export function getThumbnailUrl(publicId: string): string {
  return buildImageUrl(publicId, 'w_400,f_auto,q_auto');
}

/**
 * Optimised video delivery URL.
 * Transformation: q_auto,f_auto
 *   - Auto quality and best supported format (e.g. webm for Chrome)
 */
export function getVideoUrl(publicId: string): string {
  if (!publicId) return '';
  return `${BASE_VIDEO}/q_auto,f_auto/${publicId}`;
}

/**
 * Resolve the best available avatar URL for a user object.
 * Prefers Cloudinary-hosted image (with face crop); falls back to external URL
 * (e.g. Google OAuth photo) or empty string.
 *
 * @param user - Partial user object with profilePicPublicId and/or profilePicUrl
 */
export function resolveAvatarUrl(user?: {
  profilePicPublicId?: string;
  profilePicUrl?: string;
} | null): string {
  if (!user) return '';
  if (user.profilePicPublicId) {
    return getProfilePicUrl(user.profilePicPublicId);
  }
  return user.profilePicUrl || '';
}

// ─── Legacy URL helpers ─────────────────────────────────────────────────────

/**
 * Inject Cloudinary transforms into a raw Cloudinary URL.
 *
 * Old posts stored the full URL like:
 *   https://res.cloudinary.com/CLOUD/image/upload/v123/folder/file.jpg
 *
 * This function inserts a transform string after `/upload/` so it becomes:
 *   https://res.cloudinary.com/CLOUD/image/upload/w_1080,c_limit,f_auto,q_auto/v123/folder/file.jpg
 *
 * Non-Cloudinary URLs are returned unchanged.
 */
export function optimizeCloudinaryUrl(
  rawUrl: string,
  transform: string = 'w_1080,c_limit,f_auto,q_auto'
): string {
  if (!rawUrl) return '';

  // Only touch Cloudinary URLs
  if (!rawUrl.includes('res.cloudinary.com')) return rawUrl;

  // Insert transform after /upload/
  // Handles both /image/upload/ and /video/upload/
  return rawUrl.replace(
    /\/upload\//,
    `/upload/${transform}/`
  );
}

/**
 * Determine if a raw Cloudinary URL is a video.
 */
export function isCloudinaryVideo(url: string): boolean {
  return url.includes('/video/upload/');
}

/**
 * Apply feed-appropriate transforms to a legacy raw Cloudinary URL.
 */
export function optimizeFeedUrl(rawUrl: string): string {
  if (isCloudinaryVideo(rawUrl)) {
    return optimizeCloudinaryUrl(rawUrl, 'q_auto,f_auto');
  }
  return optimizeCloudinaryUrl(rawUrl, 'w_1080,c_limit,f_auto,q_auto');
}

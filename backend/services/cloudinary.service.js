import crypto from 'crypto';

/**
 * Cloudinary media service — the ONLY module allowed to talk to Cloudinary.
 *
 * Contract (Work 04 — real image upload):
 *  - Credentials stay server-side and are read from CLOUDINARY_CLOUD_NAME /
 *    CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET (approved env inventory).
 *  - If they are missing we NEVER fabricate a URL; callers must return 503.
 *  - Every upload lands in one of the fixed folders below. Client-supplied
 *    folder names, filenames and paths are never used — public IDs are random.
 *  - Deletion is best-effort: a cleanup failure must never break the request
 *    that triggered it, so every helper here resolves instead of throwing.
 */

// Fixed destination folders. Keys are the public values the admin client may send.
export const UPLOAD_FOLDERS = Object.freeze({
  projects: 'sabrstudio/projects',
  retail: 'sabrstudio/retail',
});

export const DEFAULT_UPLOAD_FOLDER = UPLOAD_FOLDERS.projects;

/** True only when all three Cloudinary credentials are present (values never logged). */
export function isCloudinaryConfigured() {
  return Boolean(
    String(process.env.CLOUDINARY_CLOUD_NAME || '').trim() &&
      String(process.env.CLOUDINARY_API_KEY || '').trim() &&
      String(process.env.CLOUDINARY_API_SECRET || '').trim()
  );
}

/** Maps a client target ('projects' | 'retail') to a fixed server folder. */
export function resolveFolder(target) {
  const key = String(target || '').trim().toLowerCase();
  return UPLOAD_FOLDERS[key] || DEFAULT_UPLOAD_FOLDER;
}

/** Random, non-guessable public ID. The client filename is deliberately ignored. */
export function randomPublicId() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(10).toString('hex')}`;
}

async function getClient() {
  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

/**
 * Upload an in-memory buffer to Cloudinary with upload_stream (no filesystem:
 * Vercel's is read-only).
 * @returns {Promise<{url:string, publicId:string, width:number, height:number, format:string, bytes:number}>}
 */
export async function uploadImageBuffer(buffer, options = {}) {
  const folder = options.folder || DEFAULT_UPLOAD_FOLDER;
  const format = options.format;
  const cloudinary = await getClient();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: randomPublicId(),
        resource_type: 'image',
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        invalidate: true,
        ...(format ? { format } : {}),
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result || !result.secure_url || !result.public_id) {
          return reject(new Error('Cloudinary response did not include a secure_url/public_id.'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width ?? null,
          height: result.height ?? null,
          format: result.format ?? null,
          bytes: result.bytes ?? null,
        });
      }
    );

    stream.on('error', reject);
    stream.end(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
  });
}

/**
 * Delete one Cloudinary asset. Best-effort: resolves true/false, never throws.
 */
export async function deleteAsset(publicId) {
  const id = String(publicId || '').trim();
  if (!id || !isCloudinaryConfigured()) return false;
  try {
    const cloudinary = await getClient();
    const result = await cloudinary.uploader.destroy(id, {
      resource_type: 'image',
      invalidate: true,
    });
    return result?.result === 'ok' || result?.result === 'not found';
  } catch (err) {
    // Cleanup must never break the caller (replace/delete request).
    console.warn('[Cloudinary] Asset cleanup failed for one public_id:', err?.message || err);
    return false;
  }
}

/**
 * Delete many Cloudinary assets, ignoring blanks and duplicates.
 * Best-effort: always resolves with a small summary, never rejects.
 */
export async function deleteAssets(publicIds) {
  const ids = Array.from(
    new Set(
      (Array.isArray(publicIds) ? publicIds : [publicIds])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )
  );
  if (!ids.length) return { deleted: 0, failed: 0 };
  if (!isCloudinaryConfigured()) return { deleted: 0, failed: ids.length };

  const outcomes = await Promise.allSettled(ids.map((id) => deleteAsset(id)));
  return {
    deleted: outcomes.filter((o) => o.status === 'fulfilled' && o.value).length,
    failed: outcomes.filter((o) => o.status !== 'fulfilled' || !o.value).length,
  };
}

/**
 * Collect Cloudinary public IDs stored on a Project/Retail document so a
 * replace or delete can clean the old assets up. Tolerates legacy documents
 * (plain string images, missing publicId) by simply skipping them.
 */
export function collectPublicIds(doc) {
  if (!doc) return [];
  const ids = [];
  const push = (value) => {
    const id = typeof value === 'string' ? value : value?.publicId;
    const clean = String(id || '').trim();
    if (clean) ids.push(clean);
  };
  if (Array.isArray(doc.images)) doc.images.forEach(push);
  push(doc.imagePublicId);
  if (Array.isArray(doc.gallery)) doc.gallery.forEach((g) => push({ publicId: g?.publicId }));
  return ids;
}

export default {
  UPLOAD_FOLDERS,
  DEFAULT_UPLOAD_FOLDER,
  isCloudinaryConfigured,
  resolveFolder,
  randomPublicId,
  uploadImageBuffer,
  deleteAsset,
  deleteAssets,
  collectPublicIds,
};

/**
 * Shared admin image-upload helper (Work 04).
 *
 * Client-side pre-flight mirrors the server rules so the admin gets an instant,
 * readable message instead of a round-trip:
 *   - only jpg / jpeg / png / webp / avif
 *   - max 4 MB (Vercel request-body limit; the server enforces the same value)
 * The server still re-validates MIME type AND magic bytes — this is a UX layer,
 * never the security boundary.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB

export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/avif';

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate a browser File before uploading.
 * @returns {{ok: true, file: File} | {ok: false, message: string}}
 */
export function validateImageFile(file) {
  if (!file) {
    return { ok: false, message: 'No file selected.' };
  }
  if (!ALLOWED_MIME.has(String(file.type || '').toLowerCase())) {
    return {
      ok: false,
      message: `"${file.name}" is not a supported image. Use ${ALLOWED_IMAGE_EXTENSIONS.join(', ').toUpperCase()}.`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `"${file.name}" is ${formatBytes(file.size)}. Maximum image size is 4 MB.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, message: `"${file.name}" is empty.` };
  }
  return { ok: true, file };
}

/**
 * Turn whatever the API layer threw into one readable sentence.
 */
export function describeUploadError(err) {
  if (!err) return 'Image upload failed. Please try again.';
  if (typeof err === 'string') return err;
  const status = err.status ?? err.response?.status;
  const message = err.message || err.response?.data?.message;

  if (status === 401) return 'Your session expired. Please log in again and retry.';
  if (status === 413) return message || 'Image is too large. Maximum size is 4 MB.';
  if (status === 415) return message || 'That file is not a supported image.';
  if (status === 503) {
    return message || 'Image upload is not configured on the server. Please contact the site administrator.';
  }
  if (status === 0) return 'Could not reach the server. Check your connection and try again.';
  return message || 'Image upload failed. Please try again.';
}

/**
 * Upload a list of files one at a time (the endpoint accepts one image per
 * request), reporting per-file progress and per-file errors.
 *
 * @param {File[]} files
 * @param {(file: File, options?: {onUploadProgress?: (p:number)=>void}) => Promise<any>} uploadFn
 * @returns {Promise<{uploaded: Array<{url:string, publicId:string}>, errors: string[]}>}
 */
export async function uploadImagesSequentially(files, uploadFn) {
  const uploaded = [];
  const errors = [];

  for (const file of files) {
    const check = validateImageFile(file);
    if (!check.ok) {
      errors.push(check.message);
      continue;
    }
    try {
      const res = await uploadFn(file);
      const image = res?.data?.images?.[0] || res?.images?.[0];
      if (image?.url) {
        uploaded.push({ url: image.url, publicId: image.publicId || '' });
      } else {
        errors.push(`"${file.name}" uploaded but the server returned no image URL.`);
      }
    } catch (err) {
      errors.push(describeUploadError(err));
    }
  }

  return { uploaded, errors };
}

export default {
  MAX_UPLOAD_BYTES,
  ACCEPTED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  validateImageFile,
  describeUploadError,
  uploadImagesSequentially,
  formatBytes,
};
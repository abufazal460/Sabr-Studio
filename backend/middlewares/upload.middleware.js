import multer from 'multer';
import { logger } from '../utils/logger.js';

/**
 * Admin image upload middleware (Work 04).
 *
 * - memoryStorage ONLY: Vercel's filesystem is read-only, so nothing is ever
 *   written to disk. The buffer is streamed straight to Cloudinary.
 * - Size limit: 4 MB per request. Vercel serverless functions reject larger
 *   request bodies, so a bigger limit would only surface as an opaque gateway
 *   error instead of a clean 413 from us.
 * - Validation is defence-in-depth: the declared MIME type must be allowed AND
 *   the file's magic bytes must match it. An `.exe` renamed to `.jpg` is
 *   rejected here, not by the extension.
 * - The client filename is never used: names are generated server-side.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB
export const UPLOAD_FIELD = 'file';

// MIME type -> canonical extension. 'image/jpg' is included because some
// Windows clients still send it for .jpg files.
const ALLOWED_MIME = Object.freeze({
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
});

export const ALLOWED_IMAGE_MIME_TYPES = Object.freeze(Object.keys(ALLOWED_MIME));
export const ALLOWED_IMAGE_EXTENSIONS = Object.freeze(
  Array.from(new Set(Object.values(ALLOWED_MIME)))
);

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Detect the real image format from magic bytes. Returns null when the bytes
 * do not match an allowed image container — a renamed .exe lands here.
 */
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer.subarray(0, 3).equals(JPEG_MAGIC)) return 'jpg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.subarray(0, 8).equals(PNG_MAGIC)) return 'png';

  // WEBP: 'RIFF' .... 'WEBP'
  if (
    buffer.toString('latin1', 0, 4) === 'RIFF' &&
    buffer.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  // AVIF / animated AVIS: .... 'ftyp' 'avif'|'avis'
  if (buffer.toString('latin1', 4, 8) === 'ftyp') {
    const brand = buffer.toString('latin1', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'avif';
  }

  return null;
}

/** True when the declared MIME type is one we accept. */
export function isAllowedMimeType(mimeType) {
  return Object.prototype.hasOwnProperty.call(
    ALLOWED_MIME,
    String(mimeType || '').toLowerCase().trim()
  );
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 4, // only small text fields (e.g. folder target) are expected
    parts: 8,
  },
  fileFilter(req, file, cb) {
    if (!isAllowedMimeType(file.mimetype)) {
      // Named error so the route can answer 415 instead of a generic 400.
      const err = new Error(
        `Unsupported file type. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ').toUpperCase()}.`
      );
      err.code = 'UPLOAD_UNSUPPORTED_TYPE';
      err.statusCode = 415;
      return cb(err, false);
    }
    cb(null, true);
  },
});

/**
 * Express-style middleware: parses one multipart image into req.file and
 * verifies its magic bytes. Responds directly with a sanitized JSON error so
 * the custom apiHandler router never has to interpret multer's errors.
 */
export function uploadImage(req, res, next) {
  upload.single(UPLOAD_FIELD)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: `Image is too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
            code: 'UPLOAD_TOO_LARGE',
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Send exactly one image per upload request.',
            code: 'UPLOAD_TOO_MANY_FILES',
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Malformed image upload request.',
          code: 'UPLOAD_BAD_REQUEST',
        });
      }
      if (err && err.code === 'UPLOAD_UNSUPPORTED_TYPE') {
        return res.status(err.statusCode || 415).json({
          success: false,
          message: err.message,
          code: err.code,
        });
      }
    logger.error(`[Upload] Unexpected multipart error: ${err?.message || err}`);
      return res.status(400).json({
        success: false,
        message: 'Image upload could not be processed.',
        code: 'UPLOAD_BAD_REQUEST',
      });
    }

    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No image file received. Send a multipart/form-data "file" field.',
        code: 'UPLOAD_NO_FILE',
      });
    }

    const detected = detectImageType(file.buffer);
    if (!detected) {
      return res.status(415).json({
        success: false,
        message:
          'File contents are not a supported image (checked magic bytes, not the extension).',
        code: 'UPLOAD_INVALID_IMAGE',
      });
    }

    const declaredExt = ALLOWED_MIME[String(file.mimetype).toLowerCase()];
    if (declaredExt && declaredExt !== detected) {
      return res.status(415).json({
        success: false,
        message: 'File extension and actual image contents do not match.',
        code: 'UPLOAD_TYPE_MISMATCH',
      });
    }

    // Normalized, server-owned description of the image. The client filename
    // is intentionally discarded — nothing downstream reads it.
    req.uploadedImage = {
      buffer: file.buffer,
      size: file.size,
      mimeType: String(file.mimetype).toLowerCase(),
      format: detected,
    };
    return next();
  });
}

export default uploadImage;

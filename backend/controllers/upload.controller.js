import {
  UPLOAD_FOLDERS,
  isCloudinaryConfigured,
  uploadImageBuffer,
} from '../services/cloudinary.service.js';

/**
 * POST /api/admin/uploads controller (Work 04).
 *
 * Route wiring (adminLimiter + protect) lives in apiHandler.js — this handler
 * only runs for an authenticated admin.
 *
 * Request : multipart/form-data, field "file" = one image, optional field
 *           "folder" = "projects" | "retail" (unknown values fall back to
 *           projects; the client can never choose an arbitrary folder).
 * Response: 201 { success: true, data: { images: [{ url, publicId }] } }
 *           — the same envelope shape the admin client already reads.
 *
 * Failure modes never fabricate a URL:
 *   400 no file / malformed  ·  413 too large  ·  415 wrong type
 *   503 Cloudinary not configured  ·  502 Cloudinary rejected the upload
 */
export const uploadController = {
  async uploadImage(req, res) {
    // Fail closed and say so plainly instead of returning a placeholder URL.
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          'Image upload is not configured on the server (Cloudinary credentials missing).',
        code: 'UPLOAD_NOT_CONFIGURED',
      });
    }

    const image = req.uploadedImage;
    if (!image || !image.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No image file received. Send a multipart/form-data "file" field.',
        code: 'UPLOAD_NO_FILE',
      });
    }

    const requestedFolder = String(req.body?.folder || req.body?.target || '').trim();
    const folder = Object.prototype.hasOwnProperty.call(UPLOAD_FOLDERS, requestedFolder)
      ? UPLOAD_FOLDERS[requestedFolder]
      : UPLOAD_FOLDERS.projects;

    try {
      const uploaded = await uploadImageBuffer(image.buffer, {
        folder,
        format: image.format,
      });

      return res.status(201).json({
        success: true,
        data: {
          images: [{ url: uploaded.url, publicId: uploaded.publicId }],
        },
      });
    } catch (err) {
      // Details stay server-side; the client gets a sanitized message.
      console.error('[Upload] Cloudinary upload failed:', err?.message || err);
      return res.status(502).json({
        success: false,
        message: 'Image upload failed. Please try again.',
        code: 'UPLOAD_FAILED',
      });
    }
  },
};

export default uploadController;

import { enquiryService } from '../services/enquiry.service.js';

export const enquiryController = {
  /**
   * Submit enquiry (public) — STRICT success gating.
   * success:true (201) ONLY when DB save + EmailJS delivery BOTH succeed.
   * DB saved + email failed → 502 success:false code EMAIL_FAILURE (enquiry preserved).
   * EmailJS not configured → 503 success:false code EMAIL_CONFIG_MISSING.
   * Validation failure → 400 (handled by validator). DB failure → 500 success:false.
   */
  async createEnquiry(req, res) {
    try {
      const origin = (typeof req.get === 'function' ? req.get('origin') : null) || req.headers?.origin;
      const { record, emailSent } = await enquiryService.createEnquiry({
        ...req.body,
        origin,
      });
      if (!emailSent) {
        return res.status(502).json({
          success: false,
          code: 'EMAIL_FAILURE',
          message: 'Your enquiry was saved but the notification email could not be delivered. Please try again or contact us directly.',
          data: { id: record.id || record._id },
        });
      }
      return res.status(201).json({
        success: true,
        code: 'ENQUIRY_SENT',
        message: 'Enquiry submitted successfully.',
        data: {
          id: record.id || record._id,
          name: record.name,
          status: record.status,
          emailStatus: record.emailStatus || 'sent',
          createdAt: record.createdAt,
        },
      });
    } catch (err) {
      const emailCodes = new Set([
        'EMAILJS_CONFIG_MISSING',
        'EMAILJS_AUTH_FAILED',
        'EMAILJS_INVALID_SERVICE_OR_TEMPLATE',
        'EMAILJS_RATE_LIMITED',
        'EMAILJS_API_FAILURE',
        'EMAILJS_SEND_FAILED',
        'EMAILJS_NETWORK_FAILURE',
        'EMAILJS_TIMEOUT',
      ]);
      if (err.code === 'EMAILJS_CONFIG_MISSING') {
        return res.status(503).json({
          success: false,
          code: 'EMAIL_CONFIG_MISSING',
          message: 'Email service is temporarily unavailable. Your enquiry has been saved and our team will review it shortly.',
        });
      }
      if (emailCodes.has(err.code)) {
        return res.status(err.statusCode || 502).json({
          success: false,
          code: 'EMAIL_FAILURE',
          message: 'Your enquiry was saved but the notification email could not be delivered. Please try again or contact us directly.',
        });
      }
      const isDbError = err.name === 'MongooseError' || err.name === 'MongoServerError' || err.name === 'ValidationError';
      return res.status(err.statusCode || (isDbError ? 500 : 400)).json({
        success: false,
        code: 'ENQUIRY_SAVE_FAILED',
        message: err.message || 'Failed to process enquiry submission',
      });
    }
  },

  /**
   * List enquiries (strictly admin-only)
   */
  async getAdminEnquiries(req, res) {
    try {
      const enquiries = await enquiryService.getAdminEnquiries();
      return res.status(200).json({
        success: true,
        data: enquiries,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve enquiries',
      });
    }
  },

  /**
   * Get enquiry by ID (strictly admin-only)
   */
  async getAdminEnquiryById(req, res) {
    try {
      const id = req.params?.id || req.url.split('/').pop();
      const enquiry = await enquiryService.getAdminEnquiryById(id);
      if (!enquiry) {
        return res.status(404).json({
          success: false,
          message: 'Enquiry not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: enquiry,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve enquiry',
      });
    }
  },

  /**
   * Update enquiry status (admin only)
   */
  async updateEnquiryStatus(req, res) {
    try {
      const id = req.params?.id || req.url.split('/')[4] || req.url.split('/')[3];
      const { status } = req.body;
      const updated = await enquiryService.updateEnquiryStatus(id, status);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Enquiry not found for status update',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Enquiry status updated successfully',
        data: updated,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update enquiry status',
      });
    }
  },

  /**
   * Delete enquiry (admin only)
   */
  async deleteEnquiry(req, res) {
    try {
      const id = req.params?.id || req.url.split('/').pop();
      const deleted = await enquiryService.deleteEnquiry(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Enquiry not found for deletion',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Enquiry deleted successfully',
        data: null,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to delete enquiry',
      });
    }
  },
};

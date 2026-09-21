import { enquiryService } from '../services/enquiry.service.js';

export const enquiryController = {
  /**
   * Submit enquiry (public)
   */
  async createEnquiry(req, res) {
    try {
      const enquiry = await enquiryService.createEnquiry(req.body);
      return res.status(201).json({
        success: true,
        message: 'Enquiry submitted successfully',
        data: {
          id: enquiry.id || enquiry._id,
          name: enquiry.name,
          status: enquiry.status,
          createdAt: enquiry.createdAt,
        },
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
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

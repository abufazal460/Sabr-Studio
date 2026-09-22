import express from 'express';
import { enquiryController } from '../controllers/enquiry.controller.js';
import { protect } from '../middlewares/protect.middleware.js';
import { enquiryLimiter } from '../middlewares/rateLimit.middleware.js';
import {
  createEnquiryValidator,
  updateEnquiryStatusValidator,
} from '../validators/enquiry.validator.js';

const router = express.Router();

/**
 * Public Enquiry Route (Submit only)
 * Note: Never exposed via any public read endpoint!
 * References: API.md §2.7, prompts/06-features.md §4.6
 */
router.post('/', enquiryLimiter, createEnquiryValidator, (req, res) =>
  enquiryController.createEnquiry(req, res)
);

/**
 * Admin Enquiry Routes (Protected)
 * References: API.md §2.7, prompts/06-features.md §5.5
 */
router.get('/admin/enquiries', protect, (req, res) =>
  enquiryController.getAdminEnquiries(req, res)
);
router.get('/admin/enquiries/:id', protect, (req, res) =>
  enquiryController.getAdminEnquiryById(req, res)
);
router.patch(
  '/admin/enquiries/:id/status',
  protect,
  updateEnquiryStatusValidator,
  (req, res) => enquiryController.updateEnquiryStatus(req, res)
);
router.delete('/admin/enquiries/:id', protect, (req, res) =>
  enquiryController.deleteEnquiry(req, res)
);

export default router;

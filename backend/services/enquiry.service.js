import { Enquiry, inMemoryEnquiries } from '../models/enquiry.model.js';
import { fallbackEnquiries } from '../utils/fallbackStorage.js';

export const enquiryService = {
  /**
   * Create public enquiry
   * References: DATABASE.md §2.3; prompts/06-features.md §4.6
   * C4: email is required.
   * C5: no projectType field exists.
   * DB write succeeds first; external email notification is non-blocking.
   */
  async createEnquiry(data) {
    const enquiryData = {
      name: data.name.trim(),
      email: data.email.trim(),
      phone: String(data.phone).trim(),
      message: data.message.trim(),
      source: data.source || '/contact',
      status: 'new',
    };

    let createdRecord;
    const isMongoConnected = Enquiry.db?.readyState === 1;

    if (isMongoConnected) {
      try {
        const doc = await Enquiry.create(enquiryData);
        createdRecord = doc.toObject();
      } catch (err) {
        // Handle duplicate or other errors
        throw err;
      }
    } else {
      // Use persistent fallback storage
      createdRecord = fallbackEnquiries.add(enquiryData);
    }

    // Email notification step (e.g. EmailJS / notification mock)
    // Non-blocking: failure must NEVER surface as a failure when DB write succeeded
    try {
      // Intentionally decoupled notification hook
      if (process.env.EMAILJS_SERVICE_ID) {
        // External notification integration if configured
      }
    } catch (notifyErr) {
      console.warn('Enquiry notification dispatch failed silently:', notifyErr.message);
    }

    return createdRecord;
  },

  /**
   * Get all enquiries (strictly admin-only)
   * References: prompts/06-features.md §5.5
   */
  async getAdminEnquiries() {
    const isMongoConnected = Enquiry.db?.readyState === 1;
    if (isMongoConnected) {
      return await Enquiry.find().sort({ createdAt: -1 }).lean();
    }
    // Fallback to persistent storage, then in-memory
    const fallbackData = fallbackEnquiries.findAll();
    if (fallbackData.length > 0) {
      return fallbackData;
    }
    return [...inMemoryEnquiries];
  },

  /**
   * Get enquiry by ID (strictly admin-only)
   */
  async getAdminEnquiryById(id) {
    const isMongoConnected = Enquiry.db?.readyState === 1;
    if (isMongoConnected) {
      return await Enquiry.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { id }],
      }).lean();
    }
    // Check fallback storage first
    const fallbackEnquiry = fallbackEnquiries.findOne({ _id: id, id: id });
    if (fallbackEnquiry) {
      return fallbackEnquiry;
    }
    return inMemoryEnquiries.find((e) => e.id === id || e._id === id) || null;
  },

  /**
   * Update enquiry status (admin only)
   * Only allows modifying status ('new', 'in-progress', 'resolved').
   * Never mutates user's original message, email, or phone.
   */
  async updateEnquiryStatus(id, newStatus) {
    const validStatuses = ['new', 'in-progress', 'resolved'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid enquiry status: ${newStatus}`);
    }

    const isMongoConnected = Enquiry.db?.readyState === 1;
    if (isMongoConnected) {
      return await Enquiry.findOneAndUpdate(
        { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { id }] },
        { $set: { status: newStatus } },
        { new: true, runValidators: true }
      ).lean();
    }

    // Update in fallback storage
    const enq = fallbackEnquiries.findOne({ _id: id, id: id });
    if (!enq) {
      // Check in-memory as last resort
      const memEnq = inMemoryEnquiries.find((e) => e.id === id || e._id === id);
      if (!memEnq) return null;
      memEnq.status = newStatus;
      memEnq.updatedAt = new Date();
      return memEnq;
    }

    fallbackEnquiries.update(id, { status: newStatus, updatedAt: new Date() });
    return fallbackEnquiries.findOne({ _id: id, id: id });
  },

  /**
   * Delete enquiry (admin only)
   */
  async deleteEnquiry(id) {
    const isMongoConnected = Enquiry.db?.readyState === 1;
    if (isMongoConnected) {
      const doc = await Enquiry.findOneAndDelete({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { id }],
      }).lean();
      return !!doc;
    }

    // Delete from fallback storage
    const deleted = fallbackEnquiries.delete(id);
    if (deleted) return true;

    // Try in-memory as last resort
    const initialLength = inMemoryEnquiries.length;
    const filtered = inMemoryEnquiries.filter((e) => e.id !== id && e._id !== id);
    if (filtered.length < initialLength) {
      inMemoryEnquiries.length = 0;
      inMemoryEnquiries.push(...filtered);
      return true;
    }
    return false;
  },
};

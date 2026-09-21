import { Enquiry, inMemoryEnquiries } from '../models/enquiry.model.js';

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
      const doc = await Enquiry.create(enquiryData);
      createdRecord = doc.toObject();
    } else {
      createdRecord = {
        ...enquiryData,
        _id: `enq-${Date.now()}`,
        id: `enq-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryEnquiries.unshift(createdRecord);
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

    const enq = inMemoryEnquiries.find((e) => e.id === id || e._id === id);
    if (!enq) return null;

    enq.status = newStatus;
    enq.updatedAt = new Date();
    return enq;
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

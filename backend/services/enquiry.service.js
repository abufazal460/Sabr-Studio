import { Enquiry, inMemoryEnquiries } from '../models/enquiry.model.js';
import { fallbackEnquiries } from '../utils/fallbackStorage.js';
import { sendEnquiryEmail } from './emailjs.service.js';

const SERVICE_SLUG_MAP = {
  'residential-interiors': 'Residential Interiors',
  'commercial-interiors': 'Commercial Interiors',
  'space-planning': 'Space Planning',
  'furniture-layout': 'Furniture Layout',
  '3d-visualization': '3D Visualization',
  'material-colour-consultation': 'Material & Colour Consultation',
};

export const enquiryService = {
  /**
   * Create public enquiry — STRICT delivery-verified flow:
   *   1. Save enquiry to DB (Mongo, else persistent fallback).
   *   2. Send EmailJS notification server-side and VERIFY the result.
   *   3. DB success + email success  → resolve { record, emailSent:true }.
   *   4. DB success + email failure  → preserve record, mark emailStatus
   *      'failed', and THROW (so the controller returns success:false —
   *      never a false success). DB failure → throw.
   * References: DATABASE.md §2.3; prompts/06-features.md §4.6
   * C4: email is optional (collected when provided).
   * C5: projectType is captured from the inquiry form's required select.
   */
  async createEnquiry(data) {
    const rawProjectType = String(data.projectType || '').trim();
    const formattedProjectType = SERVICE_SLUG_MAP[rawProjectType] || rawProjectType;

    const enquiryData = {
      name: String(data.name || '').trim(),
      email: String(data.email || '').trim(),
      phone: String(data.phone || '').trim(),
      projectType: formattedProjectType,
      message: String(data.message || '').trim(),
      source: data.source || data.sourceRoute || '/contact',
      sourceRoute: data.sourceRoute || data.source || '/contact',
      status: 'new',
      emailStatus: 'pending',
      emailError: '',
    };

    let createdRecord;
    let storage = 'mongo';
    const isMongoConnected = Enquiry.db?.readyState === 1;

    if (isMongoConnected) {
      try {
        const doc = await Enquiry.create(enquiryData);
        createdRecord = doc.toObject();
      } catch (err) {
        // Database failure → propagate (controller returns success:false).
        throw err;
      }
    } else {
      // Use persistent fallback storage
      storage = 'fallback';
      createdRecord = fallbackEnquiries.add(enquiryData);
    }

    const recordId = createdRecord._id || createdRecord.id;

    const persistEmailStatus = async (patch) => {
      try {
        if (storage === 'mongo' && Enquiry.db?.readyState === 1) {
          await Enquiry.updateOne({ _id: recordId }, { $set: patch });
          Object.assign(createdRecord, patch);
        } else if (storage === 'fallback') {
          const updated = fallbackEnquiries.update(recordId, patch);
          if (updated) createdRecord = updated;
          else Object.assign(createdRecord, patch);
        } else {
          Object.assign(createdRecord, patch);
        }
      } catch (persistErr) {
        console.error(`[Enquiry] email-status persist failed for ${recordId}:`, persistErr.message);
      }
    };

    // Email notification is REQUIRED for success — verify the actual result.
    try {
      await sendEnquiryEmail(
        {
          name: createdRecord.name,
          phone: createdRecord.phone,
          email: createdRecord.email || '',
          projectType: createdRecord.projectType || '',
          message: createdRecord.message || '',
        },
        {
          origin: data.origin,
        }
      );
      await persistEmailStatus({ emailStatus: 'sent', emailError: '' });
      return { record: createdRecord, emailSent: true };
    } catch (emailErr) {
      // Preserve the enquiry, record the failure (safe message only — no secrets).
      const safeCode = emailErr.code || 'EMAILJS_SEND_FAILED';
      await persistEmailStatus({ emailStatus: 'failed', emailError: safeCode });
      // Safe server log: which config is missing / which class failed — no values.
      if (safeCode === 'EMAILJS_CONFIG_MISSING') {
        console.error(
          `[Enquiry] email not sent (enquiry ${recordId} preserved): missing EmailJS config: ${(emailErr.missing || []).join(', ') || 'unknown'}`
        );
      } else {
        console.error(
          `[Enquiry] email not sent (enquiry ${recordId} preserved): ${safeCode}`
        );
      }
      // Re-throw so the controller returns success:false (never false success).
      throw emailErr;
    }
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

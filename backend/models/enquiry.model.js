import mongoose from 'mongoose';

/**
 * Enquiry Mongoose Schema
 * References: DATABASE.md §2.3, §4, §6; prompts/06-features.md §4.6, §5.5
 * Note on C4: email is required.
 * Note on C5: no projectType field exists in the canonical schema.
 * Note on security: Enquiry collection is strictly admin-only, never public.
 */
const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    source: {
      type: String,
      default: '/contact',
    },
    status: {
      type: String,
      enum: ['new', 'in-progress', 'resolved'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

enquirySchema.index({ status: 1, createdAt: -1 });

export const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema);

// In-memory store for fallback / preview mode
export const inMemoryEnquiries = [
  {
    _id: 'enq-1',
    id: 'enq-1',
    name: 'Aarav Mehta',
    email: 'aarav.mehta@example.com',
    phone: '+91 98111 22334',
    message:
      'We are looking to design a 5,000 sq.ft residential villa in Gurgaon with emphasis on natural daylight, limewash plaster, and a central courtyard.',
    source: '/contact',
    status: 'new',
    createdAt: new Date('2024-02-15T10:30:00.000Z'),
    updatedAt: new Date('2024-02-15T10:30:00.000Z'),
  },
  {
    _id: 'enq-2',
    id: 'enq-2',
    name: 'Devika Sharma',
    email: 'devika.s@example.com',
    phone: '+91 98222 33445',
    message:
      'Inquiring about acquiring 6 Komorebi Lounge Chairs and a custom fluted walnut credenza for a boutique hospitality pavilion in Jaipur.',
    source: '/retail',
    status: 'in-progress',
    createdAt: new Date('2024-02-18T14:15:00.000Z'),
    updatedAt: new Date('2024-02-19T09:00:00.000Z'),
  },
];

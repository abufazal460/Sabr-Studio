import mongoose from 'mongoose';

/**
 * Order Mongoose Schema
 * References: DATABASE.md §2.4, §4, §6; prompts/06-features.md §4.8, §5.6
 * Line items are embedded snapshots, never live populate references (ADR-05).
 * paymentStatus is set only via backend signature verification (never admin-settable).
 * orderStatus is admin-managed.
 */
const orderItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    productId: { type: String }, // compatibility alias
    itemType: { type: String, enum: ['project', 'retail'], default: 'retail' },
    name: { type: String, required: true },
    title: { type: String }, // compatibility alias
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    unitPrice: { type: Number, required: true, min: [0, 'Unit price must be non-negative'] },
    price: { type: Number }, // compatibility alias
    lineTotal: { type: Number, required: true, min: [0, 'Line total must be non-negative'] },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      name: { type: String, default: 'Client' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order must contain at least one item'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be non-negative'],
    },
    totalAmount: {
      type: Number, // compatibility alias
    },
    payment: {
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
      razorpaySignature: { type: String, default: null },
      verified: { type: Boolean, default: false },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ paymentStatus: 1, orderStatus: 1, createdAt: -1 });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// In-memory store for fallback / preview mode
export const inMemoryOrders = [
  {
    _id: 'ord-101',
    id: 'ord-101',
    orderNumber: 'SABR-782194',
    customer: {
      name: 'Rohan Kapoor',
      email: 'rohan.k@example.com',
      phone: '+91 99000 11223',
      address: 'Defense Colony, New Delhi',
    },
    items: [
      {
        itemId: 'prod-1',
        productId: 'prod-1',
        itemType: 'retail',
        name: 'Komorebi Lounge Chair',
        title: 'Komorebi Lounge Chair',
        quantity: 2,
        unitPrice: 34000,
        price: 34000,
        lineTotal: 68000,
        image:
          'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
      },
    ],
    amount: 68000,
    totalAmount: 68000,
    payment: {
      razorpayOrderId: 'order_mock_101',
      razorpayPaymentId: 'pay_mock_101',
      verified: true,
    },
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    createdAt: new Date('2024-02-16T11:20:00.000Z'),
    updatedAt: new Date('2024-02-16T11:25:00.000Z'),
  },
];

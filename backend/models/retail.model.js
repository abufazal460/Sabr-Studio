import mongoose from 'mongoose';

/**
 * Retail Product Mongoose Schema
 * References: DATABASE.md §2.2, §4, §6; prompts/06-features.md §4.3, §5.4
 */
const retailSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Chair',
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: '' },
        },
      ],
      default: [],
    },
    image: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
    },
    availability: {
      type: Boolean,
      default: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    dimensions: {
      type: String,
      default: '',
    },
    materials: {
      type: String,
      default: '',
    },
    published: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

retailSchema.index({ published: 1, availability: 1, createdAt: -1 });

export const Retail = mongoose.models.Retail || mongoose.model('Retail', retailSchema);

// In-memory store for fallback / preview mode
export const inMemoryRetail = [
  {
    _id: 'prod-1',
    id: 'prod-1',
    slug: 'komorebi-lounge-chair',
    title: 'Komorebi Lounge Chair',
    category: 'Chair',
    price: 34000,
    dimensions: '78 x 82 x 72 cm',
    materials: 'Solid white ash, Belgian natural linen',
    description:
      'Sculptural lounge chair with generous proportions and deeply pitched seat for relaxed meditation.',
    image:
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
        publicId: 'sabr/retail/komorebi-1',
      },
    ],
    availability: true,
    inStock: true,
    published: true,
    createdAt: new Date('2024-01-10T00:00:00.000Z'),
    updatedAt: new Date('2024-01-10T00:00:00.000Z'),
  },
  {
    _id: 'prod-2',
    id: 'prod-2',
    slug: 'sora-oak-coffee-table',
    title: 'Sora Oak Coffee Table',
    category: 'Table',
    price: 42000,
    dimensions: '120 x 60 x 36 cm',
    materials: 'Quarter-sawn smoked oak, oil finish',
    description:
      'Low-profile solid oak table with rounded softened edges and floating base detail.',
    image:
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
        publicId: 'sabr/retail/sora-1',
      },
    ],
    availability: true,
    inStock: true,
    published: true,
    createdAt: new Date('2024-01-12T00:00:00.000Z'),
    updatedAt: new Date('2024-01-12T00:00:00.000Z'),
  },
  {
    _id: 'prod-3',
    id: 'prod-3',
    slug: 'zenith-linen-pendant',
    title: 'Zenith Linen Pendant',
    category: 'Lighting',
    price: 18500,
    dimensions: '55 cm dia x 40 cm h',
    materials: 'Raw linen shade, blackened brass hardware',
    description:
      'Diffused ambient luminaire filtering warm downward illumination with natural fabric texture.',
    image:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
        publicId: 'sabr/retail/zenith-1',
      },
    ],
    availability: true,
    inStock: true,
    published: true,
    createdAt: new Date('2024-01-14T00:00:00.000Z'),
    updatedAt: new Date('2024-01-14T00:00:00.000Z'),
  },
  {
    _id: 'prod-4',
    id: 'prod-4',
    slug: 'mori-sculptural-credenza',
    title: 'Mori Sculptural Credenza',
    category: 'Storage',
    price: 85000,
    dimensions: '180 x 48 x 75 cm',
    materials: 'Fluted walnut, honed travertine top',
    description:
      'Architectural credenza featuring fluted solid wood doors and travertine stone counter.',
    image:
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
        publicId: 'sabr/retail/mori-1',
      },
    ],
    availability: true,
    inStock: true,
    published: true,
    createdAt: new Date('2024-01-16T00:00:00.000Z'),
    updatedAt: new Date('2024-01-16T00:00:00.000Z'),
  },
  {
    _id: 'prod-5',
    id: 'prod-5',
    slug: 'nami-ceramic-vessel',
    title: 'Nami Ceramic Vessel',
    category: 'Decor',
    price: 6200,
    dimensions: '22 cm dia x 34 cm h',
    materials: 'Hand-thrown stoneware, matte sand glaze',
    description:
      'Handcrafted stoneware vessel shaped with subtle organic asymmetries.',
    image:
      'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80',
        publicId: 'sabr/retail/nami-1',
      },
    ],
    availability: true,
    inStock: true,
    published: true,
    createdAt: new Date('2024-01-18T00:00:00.000Z'),
    updatedAt: new Date('2024-01-18T00:00:00.000Z'),
  },
  {
    _id: 'prod-6',
    id: 'prod-6',
    slug: 'wabi-daybed',
    title: 'Wabi Daybed',
    category: 'Sofa',
    price: 95000,
    dimensions: '200 x 90 x 42 cm',
    materials: 'Blackened teak frame, boucle upholstery',
    description:
      'Clean-lined daybed designed for both transitional lounging and primary seating.',
    image:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
        publicId: 'sabr/retail/wabi-1',
      },
    ],
    availability: true,
    inStock: true,
    published: true,
    createdAt: new Date('2024-01-20T00:00:00.000Z'),
    updatedAt: new Date('2024-01-20T00:00:00.000Z'),
  },
];

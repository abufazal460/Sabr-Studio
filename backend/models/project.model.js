import mongoose from 'mongoose';

/**
 * Project Mongoose Schema
 * References: DATABASE.md §2.1, §4, §6; prompts/06-features.md §4.2, §5.3
 */
const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
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
      default: 'Residential',
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    year: {
      type: Number,
      default: null,
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      default: '',
    },
    contentBlocks: {
      type: [
        {
          _id: false,
          type: {
            type: String,
            enum: ['heading', 'paragraph', 'image'],
            required: true,
          },
          text: { type: String, default: '' },
          url: { type: String, default: '' },
        },
      ],
      default: [],
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
    coverImage: {
      type: String,
      default: '',
    },
    gallery: {
      type: [String],
      default: [],
    },
    projectDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    price: {
      type: Number,
      min: [0, 'Price must be non-negative'],
      default: null,
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

projectSchema.index({ published: 1, category: 1, createdAt: -1 });

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

// In-memory store for fallback / preview mode
export const inMemoryProjects = [
  {
    _id: 'proj-1',
    id: 'proj-1',
    slug: 'the-vasant-vihar-residence',
    title: 'The Vasant Vihar Residence',
    category: 'Residential',
    location: 'New Delhi',
    year: 2024,
    area: '4,500 sq.ft',
    description:
      'A serene sanctuary in South Delhi balancing brutalist architectural geometries with tactile wabi-sabi finishes.',
    shortDescription:
      'A serene sanctuary in South Delhi balancing brutalist geometries with tactile wabi-sabi finishes.',
    contentBlocks: [
      { type: 'heading', text: 'Spatial Concept' },
      {
        type: 'paragraph',
        text:
          'The residence is organised around a shaded central courtyard, allowing every principal room to borrow filtered daylight and cross-ventilation while preserving complete visual privacy from the street.',
      },
      {
        type: 'image',
        url:
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      },
      { type: 'heading', text: 'Materiality & Light' },
      {
        type: 'paragraph',
        text:
          'Board-formed concrete, lime plaster, and smoked oak converge in a restrained palette, letting the movement of sun across textured surfaces become the primary interior ornament.',
      },
      {
        type: 'image',
        url:
          'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    coverImage:
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
        publicId: 'sabr/projects/vasant-1',
      },
      {
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        publicId: 'sabr/projects/vasant-2',
      },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
    ],
    featured: true,
    published: true,
    createdAt: new Date('2024-01-15T00:00:00.000Z'),
    updatedAt: new Date('2024-01-15T00:00:00.000Z'),
  },
  {
    _id: 'proj-2',
    id: 'proj-2',
    slug: 'studio-pavilion',
    title: 'Studio Pavilion & Creative Workspace',
    category: 'Commercial',
    location: 'Gurugram',
    year: 2023,
    area: '3,200 sq.ft',
    description:
      'An open-concept creative studio fostering quiet focus through acoustic limewash surfaces and natural ventilation.',
    shortDescription:
      'An open-concept creative studio fostering quiet focus through acoustic limewash surfaces.',
    coverImage:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        publicId: 'sabr/projects/pavilion-1',
      },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
    ],
    featured: true,
    published: true,
    createdAt: new Date('2023-11-10T00:00:00.000Z'),
    updatedAt: new Date('2023-11-10T00:00:00.000Z'),
  },
  {
    _id: 'proj-3',
    id: 'proj-3',
    slug: 'aura-wellness-haven',
    title: 'Aura Wellness Haven',
    category: 'Hospitality',
    location: 'North Goa',
    year: 2024,
    area: '6,800 sq.ft',
    description:
      'A boutique wellness retreat rooted in local terracotta craft, sheltered courtyards, and filtered tropical daylight.',
    shortDescription:
      'A boutique wellness retreat rooted in local terracotta craft and filtered tropical daylight.',
    coverImage:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
        publicId: 'sabr/projects/aura-1',
      },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    ],
    featured: true,
    published: true,
    createdAt: new Date('2024-02-01T00:00:00.000Z'),
    updatedAt: new Date('2024-02-01T00:00:00.000Z'),
  },
  {
    _id: 'proj-4',
    id: 'proj-4',
    slug: 'minimalist-penthouse',
    title: 'Minimalist Penthouse',
    category: 'Residential',
    location: 'South Delhi',
    year: 2023,
    area: '5,100 sq.ft',
    description:
      'A panoramic duplex emphasizing monolithic micro-cement volumes, smoked oak cabinetry, and concealed lighting.',
    shortDescription:
      'A panoramic duplex of monolithic micro-cement volumes, smoked oak cabinetry, and concealed lighting.',
    coverImage:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
        publicId: 'sabr/projects/penthouse-1',
      },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    ],
    featured: false,
    published: true,
    createdAt: new Date('2023-09-15T00:00:00.000Z'),
    updatedAt: new Date('2023-09-15T00:00:00.000Z'),
  },
];

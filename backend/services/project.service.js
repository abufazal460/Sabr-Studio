import { Project, inMemoryProjects } from '../models/project.model.js';

/**
 * Generate URL-safe slug from title
 */
export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const projectService = {
  /**
   * Get public projects (published only)
   */
  async getPublicProjects(filter = {}) {
    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      const query = { published: true };
      if (filter.category && filter.category !== 'All') {
        query.category = new RegExp(`^${filter.category}$`, 'i');
      }
      return await Project.find(query).sort({ createdAt: -1 }).lean();
    }

    let items = inMemoryProjects.filter((p) => p.published);
    if (filter.category && filter.category !== 'All') {
      items = items.filter(
        (p) => p.category?.toLowerCase() === filter.category.toLowerCase()
      );
    }
    return items;
  },

  /**
   * Get public project by slug (published only)
   */
  async getPublicProjectBySlug(slug) {
    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      return await Project.findOne({
        $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
        published: true,
      }).lean();
    }

    const item = inMemoryProjects.find(
      (p) => (p.slug === slug || p.id === slug || p._id === slug) && p.published
    );
    return item || null;
  },

  /**
   * Get all projects for admin
   */
  async getAdminProjects() {
    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      return await Project.find().sort({ createdAt: -1 }).lean();
    }
    return [...inMemoryProjects];
  },

  /**
   * Get project by ID for admin
   */
  async getAdminProjectById(id) {
    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      return await Project.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
      }).lean();
    }
    return inMemoryProjects.find((p) => p.id === id || p._id === id || p.slug === id) || null;
  },

  /**
   * Create project (admin only)
   * Server generates slug, client cannot specify raw arbitrary slug.
   */
  async createProject(data) {
    const generatedSlug = slugify(data.title || `project-${Date.now()}`);

    const projectData = {
      title: data.title,
      slug: generatedSlug,
      category: data.category || 'Residential',
      location: data.location || null,
      year: data.year ? Number(data.year) : null,
      area: data.area || null,
      description: data.description || '',
      images: Array.isArray(data.images) ? data.images : [],
      coverImage:
        data.coverImage ||
        (Array.isArray(data.images) && data.images[0]?.url) ||
        '',
      gallery: Array.isArray(data.gallery)
        ? data.gallery
        : Array.isArray(data.images)
        ? data.images.map((img) => (typeof img === 'string' ? img : img.url))
        : [],
      price: data.price !== undefined && data.price !== null ? Number(data.price) : null,
      published: data.published !== undefined ? Boolean(data.published) : false,
      featured: Boolean(data.featured),
    };

    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      const doc = await Project.create(projectData);
      return doc.toObject();
    }

    const newProject = {
      ...projectData,
      _id: `proj-${Date.now()}`,
      id: `proj-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryProjects.unshift(newProject);
    return newProject;
  },

  /**
   * Update project (admin only)
   */
  async updateProject(id, updateData) {
    // Slug is immutable post-publish per DATABASE.md §2.1
    const { slug, _id, id: rawId, createdAt, ...allowedUpdates } = updateData;

    if (allowedUpdates.year !== undefined && allowedUpdates.year !== null) {
      allowedUpdates.year = Number(allowedUpdates.year);
    }
    if (allowedUpdates.price !== undefined && allowedUpdates.price !== null) {
      allowedUpdates.price = Number(allowedUpdates.price);
    }
    if (allowedUpdates.published !== undefined) {
      allowedUpdates.published = Boolean(allowedUpdates.published);
    }

    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      const updated = await Project.findOneAndUpdate(
        { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }] },
        { $set: allowedUpdates },
        { new: true, runValidators: true }
      ).lean();
      return updated;
    }

    const index = inMemoryProjects.findIndex(
      (p) => p.id === id || p._id === id || p.slug === id
    );
    if (index === -1) return null;

    inMemoryProjects[index] = {
      ...inMemoryProjects[index],
      ...allowedUpdates,
      updatedAt: new Date(),
    };
    return inMemoryProjects[index];
  },

  /**
   * Delete project (admin only)
   */
  async deleteProject(id) {
    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      const doc = await Project.findOneAndDelete({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
      }).lean();
      return !!doc;
    }

    const initialLength = inMemoryProjects.length;
    const filtered = inMemoryProjects.filter(
      (p) => p.id !== id && p._id !== id && p.slug !== id
    );
    if (filtered.length < initialLength) {
      inMemoryProjects.length = 0;
      inMemoryProjects.push(...filtered);
      return true;
    }
    return false;
  },
};

import { Project, inMemoryProjects } from '../models/project.model.js';
import { collectPublicIds, deleteAssets } from './cloudinary.service.js';

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
    let items = [];
    if (isMongoConnected) {
      const query = { published: true };
      if (filter.category && filter.category !== 'All') {
        query.category = new RegExp(`^${filter.category}$`, 'i');
      }
      const dbItems = await Project.find(query).sort({ createdAt: -1 }).lean();
      // Fallback to in‑memory data if DB collection is empty
      if (Array.isArray(dbItems) && dbItems.length) {
        items = dbItems;
      }
    }

    if (!items.length) {
      items = inMemoryProjects.filter((p) => p.published);
      if (filter.category && filter.category !== 'All') {
        items = items.filter(
          (p) => p.category?.toLowerCase() === filter.category.toLowerCase()
        );
      }
    }

    if (filter.limit) {
      const page = Math.max(1, parseInt(filter.page, 10) || 1);
      const limit = Math.max(1, parseInt(filter.limit, 10));
      const skip = (page - 1) * limit;
      return items.slice(skip, skip + limit);
    }

    return items;
  },

  /**
   * Get public project by slug (published only)
   */
  async getPublicProjectBySlug(slug) {
    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      const item = await Project.findOne({
        $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
        published: true,
      }).lean();
      if (item) return item;
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
      const items = await Project.find().sort({ createdAt: -1 }).lean();
      return items.map((doc) => ({
        ...doc,
        id: doc._id.toString(),
      }));
    }
    return [...inMemoryProjects];
  },

  /**
   * Get project by ID for admin
   */
  async getAdminProjectById(id) {
    const cleanId = String(id || '').trim();
    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      const item = await Project.findOne({
        $or: [{ _id: cleanId.match(/^[0-9a-fA-F]{24}$/) ? cleanId : null }, { slug: cleanId }],
      }).lean();
      if (item) {
        return { ...item, id: item._id.toString() };
      }
    }
    return inMemoryProjects.find((p) => p.id === cleanId || p._id === cleanId || p.slug === cleanId) || null;
  },

  /**
   * Create project (admin only)
   * Server generates slug, client cannot specify raw arbitrary slug.
   */
  async createProject(data) {
    const generatedSlug = slugify(data.title || `project-${Date.now()}`);

    const projectData = {
      title: String(data.title || '').trim(),
      slug: generatedSlug,
      category: String(data.category || 'Residential').trim(),
      location: data.location ? String(data.location).trim() : null,
      year: data.year ? Number(data.year) : null,
      area: data.area ? String(data.area).trim() : null,
      description: String(data.description || '').trim(),
      shortDescription: String(data.shortDescription || '').trim(),
      contentBlocks: Array.isArray(data.contentBlocks)
        ? data.contentBlocks.map((block) => ({
            type: block.type,
            text: block.text || '',
            url: block.url || '',
          }))
        : [],
      images: Array.isArray(data.images)
        ? data.images.map((img) => ({
            url: typeof img === 'string' ? img.trim() : String(img?.url || '').trim(),
            publicId: typeof img === 'string' ? '' : String(img?.publicId || '').trim(),
          }))
        : [],
      coverImage:
        data.coverImage ||
        (Array.isArray(data.images) && (data.images[0]?.url || data.images[0])) ||
        '',
      coverImagePublicId: String(data.coverImagePublicId || '').trim(),
      gallery: Array.isArray(data.gallery)
        ? data.gallery
        : Array.isArray(data.images)
        ? data.images.map((img) => (typeof img === 'string' ? img : img.url))
        : [],
      price: data.price !== undefined && data.price !== null ? Number(data.price) : null,
      published: data.published !== undefined ? Boolean(data.published) : false,
      featured: Boolean(data.featured),
      seo: {
        title: String(data.seo?.title || '').trim(),
        description: String(data.seo?.description || '').trim(),
        ogImage: String(data.seo?.ogImage || '').trim(),
      },
    };

    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      const doc = await Project.create(projectData);
      const obj = doc.toObject();
      return { ...obj, id: obj._id.toString() };
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
    const cleanId = String(id || '').trim();
    // Strict allow-list: client-sent role, amount, isPaid, paymentStatus, status, etc. are completely ignored
    const allowedUpdates = {};
    if (updateData.title !== undefined) allowedUpdates.title = String(updateData.title).trim();
    if (updateData.category !== undefined) allowedUpdates.category = String(updateData.category).trim();
    if (updateData.location !== undefined) allowedUpdates.location = updateData.location ? String(updateData.location).trim() : null;
    if (updateData.area !== undefined) allowedUpdates.area = updateData.area ? String(updateData.area).trim() : null;
    if (updateData.shortDescription !== undefined) allowedUpdates.shortDescription = String(updateData.shortDescription).trim();
    if (updateData.description !== undefined) allowedUpdates.description = String(updateData.description).trim();
    if (updateData.year !== undefined && updateData.year !== null) allowedUpdates.year = Number(updateData.year);
    if (updateData.price !== undefined && updateData.price !== null) allowedUpdates.price = Number(updateData.price);
    if (updateData.published !== undefined) allowedUpdates.published = Boolean(updateData.published);
    if (updateData.featured !== undefined) allowedUpdates.featured = Boolean(updateData.featured);
    if (updateData.coverImage !== undefined) allowedUpdates.coverImage = String(updateData.coverImage).trim();
    if (updateData.coverImagePublicId !== undefined) {
      allowedUpdates.coverImagePublicId = String(updateData.coverImagePublicId || '').trim();
    }
    if (Array.isArray(updateData.images)) {
      allowedUpdates.images = updateData.images.map((img) => ({
        url: typeof img === 'string' ? img.trim() : String(img?.url || '').trim(),
        publicId: typeof img === 'string' ? '' : String(img?.publicId || '').trim(),
      }));
      if (updateData.gallery === undefined) {
        allowedUpdates.gallery = allowedUpdates.images.map((img) => img.url);
      }
    }
    if (Array.isArray(updateData.gallery)) {
      allowedUpdates.gallery = updateData.gallery.map((g) => (typeof g === 'string' ? g : String(g?.url || '')));
    }
    if (Array.isArray(updateData.contentBlocks)) {
      allowedUpdates.contentBlocks = updateData.contentBlocks.map((block) => ({
        type: block.type,
        text: block.text || '',
        url: block.url || '',
      }));
    }
    if (updateData.seo !== undefined) {
      allowedUpdates.seo = {
        title: String(updateData.seo?.title || '').trim(),
        description: String(updateData.seo?.description || '').trim(),
        ogImage: String(updateData.seo?.ogImage || '').trim(),
      };
    }

    const nextImageIds = Array.isArray(allowedUpdates.images)
      ? allowedUpdates.images.map((img) => img.publicId).filter(Boolean)
      : null;
    const nextCoverId =
      allowedUpdates.coverImagePublicId !== undefined
        ? String(allowedUpdates.coverImagePublicId).trim()
        : null;

    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      const filter = {
        $or: [{ _id: cleanId.match(/^[0-9a-fA-F]{24}$/) ? cleanId : null }, { slug: cleanId }],
      };
      // Read the previous document first so replaced images can be cleaned up.
      const previous = await Project.findOne(filter).lean();
      const updated = await Project.findOneAndUpdate(filter, { $set: allowedUpdates }, {
        new: true,
        runValidators: true,
      }).lean();
      if (updated) {
        // Best-effort: an asset that is no longer referenced anywhere is deleted.
        // A cleanup failure must never fail the update (deleteAssets never throws).
        await cleanupReplacedAssets(previous, nextImageIds, nextCoverId);
        return { ...updated, id: updated._id.toString() };
      }
      return null;
    }

    const index = inMemoryProjects.findIndex(
      (p) => p.id === cleanId || p._id === cleanId || p.slug === cleanId
    );
    if (index === -1) return null;

    const previous = inMemoryProjects[index];
    inMemoryProjects[index] = {
      ...inMemoryProjects[index],
      ...allowedUpdates,
      updatedAt: new Date(),
    };
    await cleanupReplacedAssets(previous, nextImageIds, nextCoverId);
    return inMemoryProjects[index];
  },

  /**
   * Delete Cloudinary assets (admin only)
   */
  async deleteProject(id) {
    const cleanId = String(id || '').trim();
    const isMongoConnected = Project.db?.readyState === 1;
    if (isMongoConnected) {
      const doc = await Project.findOneAndDelete({
        $or: [{ _id: cleanId.match(/^[0-9a-fA-F]{24}$/) ? cleanId : null }, { slug: cleanId }],
      }).lean();
      if (!doc) return false;
      // Best-effort media cleanup after the record is already gone.
      await deleteAssets(collectPublicIds(doc));
      return true;
    }

    const initialLength = inMemoryProjects.length;
    const removed = inMemoryProjects.filter(
      (p) => p.id === cleanId || p._id === cleanId || p.slug === cleanId
    );
    const filtered = inMemoryProjects.filter(
      (p) => p.id !== cleanId && p._id !== cleanId && p.slug !== cleanId
    );
    if (filtered.length < initialLength) {
      inMemoryProjects.length = 0;
      inMemoryProjects.push(...filtered);
      for (const doc of removed) await deleteAssets(collectPublicIds(doc));
      return true;
    }
    return false;
  },
};

/**
 * Delete the Cloudinary assets a project update dropped. Only public IDs that
 * existed before AND are absent from the new image list / new cover are removed,
 * so reordering or re-saving never destroys a live asset. Never throws.
 */
async function cleanupReplacedAssets(previous, nextImageIds, nextCoverId) {
  if (!previous) return { deleted: 0, failed: 0 };
  // Only run when this update actually carried image data. A publish/stock
  // toggle sends no images, and must never delete the existing assets.
  if (!nextImageIds && nextCoverId === null) return { deleted: 0, failed: 0 };

  const previousIds = collectPublicIds(previous);
  if (!previousIds.length) return { deleted: 0, failed: 0 };

  const kept = new Set(
    [
      ...(nextImageIds || []),
      ...(nextCoverId ? [nextCoverId] : []),
    ]
      .map((id) => String(id || '').trim())
      .filter(Boolean)
  );

  const staleIds = previousIds.filter((id) => !kept.has(id));
  if (!staleIds.length) return { deleted: 0, failed: 0 };
  return deleteAssets(staleIds);
}

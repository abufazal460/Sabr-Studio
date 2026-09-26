import React, { useState, useEffect } from 'react';
import {
  LuFolderGit2,
  LuPackage,
  LuMail,
  LuShoppingBag,
  LuPlus,
  LuTrash2,
  LuPencil,
  LuRefreshCw,
  LuCheck,
  LuX,
  LuEye,
  LuEyeOff,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import adminApi from '../api/adminProjects.api';
import { getRetailProducts } from '../../retail/api/retail.api';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { Button } from '../../../shared/components/Button';
import Badge from '../../../shared/components/Badge';
import TextInput from '../../../shared/components/TextInput';
import TextArea from '../../../shared/components/TextArea';
import Select from '../../../shared/components/Select';
import Skeleton from '../../../shared/components/Skeleton';
import EmptyState from '../../../shared/components/EmptyState';
import Seo from '../../../shared/components/Seo';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [projects, setProjects] = useState([]);
  const [retailItems, setRetailItems] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [orders, setOrders] = useState([]);

  // Modal states
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [retailModalOpen, setRetailModalOpen] = useState(false);
  const [viewEnquiryModal, setViewEnquiryModal] = useState(null);

  // Form states
  const emptyProjectForm = {
    title: '',
    location: '',
    year: '',
    area: '',
    shortDescription: '',
    description: '',
    coverImage: '',
    published: false,
    images: [],
    contentBlocks: [],
  };

  const [projectForm, setProjectForm] = useState(emptyProjectForm);

  const [retailForm, setRetailForm] = useState({
    title: '',
    category: 'Chairs',
    price: 45000,
    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=700&q=80',
    description: '',
    dimensions: '600mm W × 580mm D × 740mm H',
    materials: 'Solid Ash timber, natural beeswax, Belgian linen',
    inStock: true,
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [projRes, retRes, enqRes, ordRes] = await Promise.allSettled([
        adminApi.getProjects(),
        getRetailProducts(),
        adminApi.getEnquiries(),
        adminApi.getOrders(),
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data) {
        setProjects(Array.isArray(projRes.value.data) ? projRes.value.data : []);
      }
      if (retRes.status === 'fulfilled' && retRes.value?.data) {
        setRetailItems(Array.isArray(retRes.value.data) ? retRes.value.data : []);
      }
      if (enqRes.status === 'fulfilled' && enqRes.value?.data) {
        setEnquiries(Array.isArray(enqRes.value.data) ? enqRes.value.data : []);
      }
      if (ordRes.status === 'fulfilled' && ordRes.value?.data) {
        setOrders(Array.isArray(ordRes.value.data) ? ordRes.value.data : []);
      }
    } catch (e) {
      console.error('Error loading admin data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSaveProject = async (e) => {
    e.preventDefault();
    const usableImages = projectForm.images.filter((img) => img.url && img.url.trim());
    const payload = {
      title: projectForm.title,
      location: projectForm.location || null,
      year: projectForm.year ? Number(projectForm.year) : null,
      area: projectForm.area || null,
      shortDescription: projectForm.shortDescription || '',
      description: projectForm.description || '',
      coverImage:
        projectForm.coverImage || (usableImages[0] && usableImages[0].url) || '',
      images: usableImages.map((img) => ({ url: img.url, publicId: img.publicId || '' })),
      gallery: usableImages.map((img) => img.url),
      contentBlocks: projectForm.contentBlocks.map((block) => ({
        type: block.type,
        text: block.text || '',
        url: block.url || '',
      })),
      published: Boolean(projectForm.published),
    };

    try {
      if (editingProjectId) {
        const res = await adminApi.updateProject(editingProjectId, payload);
        const saved = res?.data;
        setProjects((prev) =>
          prev.map((p) =>
            (p.id || p._id) === editingProjectId ? { ...p, ...(saved || payload) } : p
          )
        );
      } else {
        const res = await adminApi.createProject(payload);
        const saved = res?.data;
        setProjects((prev) => [
          saved || { ...payload, id: `proj-${Date.now()}`, _id: `proj-${Date.now()}` },
          ...prev,
        ]);
      }
    } catch (err) {
      window.alert(err?.response?.data?.message || err.message || 'Failed to save project.');
      return;
    }

    setProjectModalOpen(false);
    setEditingProjectId(null);
    setProjectForm(emptyProjectForm);
  };

  const openProjectModal = (project) => {
    if (project) {
      setEditingProjectId(project.id || project._id);
      const seededImages =
        Array.isArray(project.images) && project.images.length
          ? project.images.map((img) => ({
              url: typeof img === 'string' ? img : img.url,
              publicId: typeof img === 'string' ? '' : img.publicId || '',
            }))
          : project.coverImage
          ? [{ url: project.coverImage, publicId: '' }]
          : [];
      setProjectForm({
        title: project.title || '',
        location: project.location || '',
        year: project.year ?? '',
        area: project.area || '',
        shortDescription: project.shortDescription || '',
        description: project.description || '',
        coverImage: project.coverImage || '',
        published: Boolean(project.published),
        images: seededImages,
        contentBlocks: Array.isArray(project.contentBlocks)
          ? project.contentBlocks.map((block) => ({ ...block }))
          : [],
      });
    } else {
      setEditingProjectId(null);
      setProjectForm(emptyProjectForm);
    }
    setProjectModalOpen(true);
  };

  const handleTogglePublish = (project) => {
    const id = project.id || project._id;
    const next = !project.published;
    setProjects((prev) =>
      prev.map((p) => ((p.id || p._id) === id ? { ...p, published: next } : p))
    );
    adminApi.updateProject(id, { published: next }).catch(() => {});
  };

  const updateProjectImage = (idx, url) =>
    setProjectForm((f) => ({
      ...f,
      images: f.images.map((img, i) => (i === idx ? { ...img, url } : img)),
    }));

  const removeProjectImage = (idx) =>
    setProjectForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== idx),
    }));

  const addProjectImage = () =>
    setProjectForm((f) => ({ ...f, images: [...f.images, { url: '', publicId: '' }] }));

  const updateContentBlock = (idx, patch) =>
    setProjectForm((f) => ({
      ...f,
      contentBlocks: f.contentBlocks.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }));

  const removeContentBlock = (idx) =>
    setProjectForm((f) => ({
      ...f,
      contentBlocks: f.contentBlocks.filter((_, i) => i !== idx),
    }));

  const moveContentBlock = (idx, dir) =>
    setProjectForm((f) => {
      const next = [...f.contentBlocks];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return f;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...f, contentBlocks: next };
    });

  const addContentBlock = () =>
    setProjectForm((f) => ({
      ...f,
      contentBlocks: [...f.contentBlocks, { type: 'paragraph', text: '', url: '' }],
    }));

  const handleCreateRetail = async (e) => {
    e.preventDefault();
    const newItem = {
      ...retailForm,
      id: `retail-${Date.now()}`,
      price: Number(retailForm.price),
      slug: retailForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    };
    try {
      await adminApi.createRetailItem(newItem);
    } catch {
      // Local optimistic fallback
    }
    setRetailItems((prev) => [newItem, ...prev]);
    setRetailModalOpen(false);
    setRetailForm({
      title: '',
      category: 'Chairs',
      price: 45000,
      image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=700&q=80',
      description: '',
      dimensions: '600mm W × 580mm D × 740mm H',
      materials: 'Solid Ash timber, natural beeswax, Belgian linen',
      inStock: true,
    });
  };

  const handleDeleteProject = (id) => {
    if (!window.confirm('Delete this project from catalog?')) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    adminApi.deleteProject(id).catch(() => {});
  };

  const handleDeleteRetail = (id) => {
    if (!window.confirm('Delete this retail item?')) return;
    setRetailItems((prev) => prev.filter((r) => r.id !== id));
    adminApi.deleteRetailItem(id).catch(() => {});
  };

  const handleToggleRetailStock = (id) => {
    setRetailItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, inStock: !r.inStock } : r))
    );
  };

  const handleUpdateEnquiryStatus = (id, newStatus) => {
    setEnquiries((prev) =>
      prev.map((enq) => (enq.id === id ? { ...enq, status: newStatus } : enq))
    );
    adminApi.updateEnquiryStatus(id, newStatus).catch(() => {});
  };

  return (
    <div className="space-y-8">
      <Seo title="Admin Operations Portal" noIndex />

      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted font-medium block">
            Studio Operations
          </span>
          <h1 className="font-abhaya text-3xl sm:text-4xl font-medium text-ink">
            Management Portal
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={loadAllData}
            className="inline-flex items-center space-x-2 px-3.5 py-2 border border-border bg-white text-ink text-xs uppercase tracking-wider font-medium hover:border-black transition-colors"
          >
            <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-border rounded-md space-y-2">
          <div className="flex justify-between items-center text-muted">
            <span className="text-xs uppercase tracking-wider font-medium">Projects</span>
            <LuFolderGit2 className="w-4 h-4 text-ink" />
          </div>
          <div className="font-inter text-3xl font-semibold text-ink">
            {projects.length}
          </div>
          <p className="text-[11px] text-muted">Published commissions</p>
        </div>

        <div className="p-6 bg-white border border-border rounded-md space-y-2">
          <div className="flex justify-between items-center text-muted">
            <span className="text-xs uppercase tracking-wider font-medium">Retail Items</span>
            <LuPackage className="w-4 h-4 text-ink" />
          </div>
          <div className="font-inter text-3xl font-semibold text-ink">
            {retailItems.length}
          </div>
          <p className="text-[11px] text-muted">Catalog furniture & objects</p>
        </div>

        <div className="p-6 bg-white border border-border rounded-md space-y-2">
          <div className="flex justify-between items-center text-muted">
            <span className="text-xs uppercase tracking-wider font-medium">Enquiries</span>
            <LuMail className="w-4 h-4 text-ink" />
          </div>
          <div className="font-inter text-3xl font-semibold text-ink">
            {enquiries.length}
          </div>
          <p className="text-[11px] text-muted">Client consultation requests</p>
        </div>

        <div className="p-6 bg-white border border-border rounded-md space-y-2">
          <div className="flex justify-between items-center text-muted">
            <span className="text-xs uppercase tracking-wider font-medium">Orders</span>
            <LuShoppingBag className="w-4 h-4 text-ink" />
          </div>
          <div className="font-inter text-3xl font-semibold text-ink">
            {orders.length}
          </div>
          <p className="text-[11px] text-muted">Retail acquisitions</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b border-border overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'All Operations' },
          { id: 'projects', label: `Projects (${projects.length})` },
          { id: 'retail', label: `Retail Catalog (${retailItems.length})` },
          { id: 'enquiries', label: `Enquiries (${enquiries.length})` },
          { id: 'orders', label: `Orders (${orders.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-black text-black font-semibold bg-white/50'
                : 'border-transparent text-muted hover:text-black hover:border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Projects Management */}
      {(activeTab === 'overview' || activeTab === 'projects') && (
        <div className="bg-white border border-border rounded-md p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-abhaya text-2xl text-ink font-medium">
                Architectural Projects
              </h2>
              <p className="text-xs text-muted">Manage portfolio commissions and details</p>
            </div>
            <Button
              variant="Primary"
              size="sm"
              icon={LuPlus}
              iconPosition="left"
              label="Add Project"
              onClick={() => openProjectModal(null)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-muted uppercase tracking-wider border-y border-border">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((proj) => {
                  const projId = proj.id || proj._id;
                  return (
                    <tr key={projId} className="hover:bg-surface/50">
                      <td className="py-3 px-4 font-medium text-ink font-inter">
                        {proj.title}
                      </td>
                      <td className="py-3 px-4">
                        {proj.published ? (
                          <Badge variant="success">Published</Badge>
                        ) : (
                          <Badge variant="error">Draft</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted">{proj.location}</td>
                      <td className="py-3 px-4 text-muted font-mono">{proj.year}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openProjectModal(proj)}
                          className="p-1 text-muted hover:text-ink transition-colors"
                          title="Edit project"
                        >
                          <LuPencil className="w-4 h-4 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(proj)}
                          className="p-1 text-muted hover:text-ink transition-colors"
                          title={proj.published ? 'Unpublish project' : 'Publish project'}
                        >
                          {proj.published ? (
                            <LuEyeOff className="w-4 h-4 inline" />
                          ) : (
                            <LuEye className="w-4 h-4 inline" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(projId)}
                          className="p-1 text-muted hover:text-error transition-colors"
                          title="Delete project"
                        >
                          <LuTrash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Retail Catalog */}
      {(activeTab === 'overview' || activeTab === 'retail') && (
        <div className="bg-white border border-border rounded-md p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-abhaya text-2xl text-ink font-medium">
                Retail Catalog & Editions
              </h2>
              <p className="text-xs text-muted">Stock availability, pricing, and specifications</p>
            </div>
            <Button
              variant="Primary"
              size="sm"
              icon={LuPlus}
              iconPosition="left"
              label="Add Item"
              onClick={() => setRetailModalOpen(true)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-muted uppercase tracking-wider border-y border-border">
                <tr>
                  <th className="py-3 px-4">Edition</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price (INR)</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {retailItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface/50">
                    <td className="py-3 px-4 font-medium text-ink font-inter">
                      {item.title}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">{item.category}</Badge>
                    </td>
                    <td className="py-3 px-4 font-inter text-ink">
                      {formatPrice(item.price)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleRetailStock(item.id)}
                        className="cursor-pointer"
                      >
                        {item.inStock !== false ? (
                          <Badge variant="success">In Stock</Badge>
                        ) : (
                          <Badge variant="error">Sold Out</Badge>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteRetail(item.id)}
                        className="p-1 text-muted hover:text-error transition-colors"
                        title="Delete edition"
                      >
                        <LuTrash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Enquiries */}
      {(activeTab === 'overview' || activeTab === 'enquiries') && (
        <div className="bg-white border border-border rounded-md p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-abhaya text-2xl text-ink font-medium">
              Consultation Enquiries
            </h2>
            <p className="text-xs text-muted">Submitted via public website forms</p>
          </div>

          {enquiries.length === 0 ? (
            <p className="text-xs text-muted py-6">No consultation enquiries on record yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-muted uppercase tracking-wider border-y border-border">
                  <tr>
                    <th className="py-3 px-4">Client Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Message Preview</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {enquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-surface/50">
                      <td className="py-3 px-4 font-medium text-ink">{enq.name}</td>
                      <td className="py-3 px-4 text-muted">{enq.email}</td>
                      <td className="py-3 px-4 font-mono text-muted">{enq.phone}</td>
                      <td className="py-3 px-4 text-muted max-w-xs truncate">
                        {enq.message || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={enq.status || 'new'}
                          onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value)}
                          className="text-xs border border-border bg-white px-2 py-1 rounded-none text-ink"
                        >
                          <option value="new">New</option>
                          <option value="in_review">In Review</option>
                          <option value="contacted">Contacted</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setViewEnquiryModal(enq)}
                          className="p-1 text-muted hover:text-ink transition-colors"
                          title="View enquiry details"
                        >
                          <LuEye className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Orders */}
      {(activeTab === 'overview' || activeTab === 'orders') && (
        <div className="bg-white border border-border rounded-md p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-abhaya text-2xl text-ink font-medium">
              Retail Acquisitions & Orders
            </h2>
            <p className="text-xs text-muted">Processed studio orders and dispatch tracking</p>
          </div>

          {orders.length === 0 ? (
            <p className="text-xs text-muted py-6">No retail orders on record yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-muted uppercase tracking-wider border-y border-border">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-surface/50">
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        {ord.orderNumber || ord.id}
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {Array.isArray(ord.items) ? ord.items.length : 1} pcs
                      </td>
                      <td className="py-3 px-4 font-inter text-ink font-medium">
                        {formatPrice(ord.totalAmount || ord.amount || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="success">{ord.status || 'Confirmed'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add / Edit Project */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-md p-6 sm:p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-abhaya text-2xl font-medium text-ink">
                {editingProjectId ? 'Edit Architectural Project' : 'Add Architectural Project'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setProjectModalOpen(false);
                  setEditingProjectId(null);
                }}
                className="p-1 text-muted hover:text-ink"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <TextInput
                id="proj-title"
                label="Project Title"
                required
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                placeholder="e.g. Vasant Vihar Courtyard Residence"
              />

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  id="proj-location"
                  label="Location"
                  value={projectForm.location}
                  onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                  placeholder="New Delhi, India"
                />
                <TextInput
                  id="proj-year"
                  label="Completion Year"
                  value={projectForm.year}
                  onChange={(e) => setProjectForm({ ...projectForm, year: e.target.value })}
                  placeholder="2024"
                />
              </div>

              <TextInput
                id="proj-area"
                label="Built Area"
                value={projectForm.area}
                onChange={(e) => setProjectForm({ ...projectForm, area: e.target.value })}
                placeholder="5,200 sq.ft."
              />

              <TextArea
                id="proj-short-desc"
                label="Short Description (listing)"
                rows={2}
                value={projectForm.shortDescription}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, shortDescription: e.target.value })
                }
                placeholder="One or two sentences shown on the Projects listing..."
              />

              <TextArea
                id="proj-desc"
                label="Detailed Description (fallback narrative)"
                rows={3}
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Describe spatial concept, lighting, and materiality..."
              />

              <label className="flex items-center space-x-2 text-xs font-medium text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={projectForm.published}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, published: e.target.checked })
                  }
                  className="w-4 h-4 accent-black"
                />
                <span>Published (visible on the public site)</span>
              </label>

              {/* Images editor with selectable listing/hero image */}
              <div className="space-y-3 border-t border-border pt-4">
                <span className="text-xs uppercase tracking-wider font-medium text-muted block">
                  Project Images
                </span>
                {projectForm.images.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="proj-cover-select"
                      checked={projectForm.coverImage === img.url && img.url !== ''}
                      onChange={() => setProjectForm({ ...projectForm, coverImage: img.url })}
                      title="Use as listing & hero image"
                      className="w-4 h-4 accent-black shrink-0"
                    />
                    <TextInput
                      value={img.url}
                      onChange={(e) => updateProjectImage(idx, e.target.value)}
                      placeholder="https://... image URL"
                    />
                    <button
                      type="button"
                      onClick={() => removeProjectImage(idx)}
                      className="p-1 text-muted hover:text-error transition-colors shrink-0"
                      title="Remove image"
                    >
                      <LuTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="Secondary-Outline"
                    size="sm"
                    icon={LuPlus}
                    iconPosition="left"
                    label="Add image"
                    onClick={addProjectImage}
                  />
                  <span className="text-[11px] text-muted">
                    Select the radio button to choose the listing & hero image.
                  </span>
                </div>
              </div>

              {/* Detail page content blocks editor */}
              <div className="space-y-3 border-t border-border pt-4">
                <span className="text-xs uppercase tracking-wider font-medium text-muted block">
                  Detail Page Content Blocks
                </span>
                {projectForm.contentBlocks.map((block, idx) => (
                  <div key={idx} className="border border-border rounded-sm p-3 space-y-2 bg-surface/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-muted">Block {idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveContentBlock(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 text-muted hover:text-ink transition-colors disabled:opacity-30"
                          title="Move up"
                        >
                          <LuArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveContentBlock(idx, 1)}
                          disabled={idx === projectForm.contentBlocks.length - 1}
                          className="p-1 text-muted hover:text-ink transition-colors disabled:opacity-30"
                          title="Move down"
                        >
                          <LuArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeContentBlock(idx)}
                          className="p-1 text-muted hover:text-error transition-colors"
                          title="Remove block"
                        >
                          <LuTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <Select
                      value={block.type}
                      onChange={(e) => updateContentBlock(idx, { type: e.target.value })}
                      options={[
                        { value: 'heading', label: 'Heading' },
                        { value: 'paragraph', label: 'Paragraph' },
                        { value: 'image', label: 'Image' },
                      ]}
                    />
                    {block.type === 'image' ? (
                      <TextInput
                        value={block.url}
                        onChange={(e) => updateContentBlock(idx, { url: e.target.value })}
                        placeholder="https://... image URL"
                      />
                    ) : (
                      <TextArea
                        rows={block.type === 'heading' ? 1 : 3}
                        value={block.text}
                        onChange={(e) => updateContentBlock(idx, { text: e.target.value })}
                        placeholder={
                          block.type === 'heading' ? 'Section heading' : 'Paragraph text...'
                        }
                      />
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="Secondary-Outline"
                  size="sm"
                  icon={LuPlus}
                  iconPosition="left"
                  label="Add content block"
                  onClick={addContentBlock}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="Secondary-Outline"
                  label="Cancel"
                  onClick={() => {
                    setProjectModalOpen(false);
                    setEditingProjectId(null);
                  }}
                />
                <Button type="submit" variant="Primary" label="Save Project" />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Retail Item */}
      {retailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-md p-6 sm:p-8 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-abhaya text-2xl font-medium text-ink">
                Add Bespoke Retail Edition
              </h3>
              <button
                type="button"
                onClick={() => setRetailModalOpen(false)}
                className="p-1 text-muted hover:text-ink"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRetail} className="space-y-4">
              <TextInput
                id="ret-title"
                label="Piece Title"
                required
                value={retailForm.title}
                onChange={(e) => setRetailForm({ ...retailForm, title: e.target.value })}
                placeholder="e.g. Travertine Plinth Coffee Table"
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="ret-category"
                  label="Category"
                  value={retailForm.category}
                  onChange={(e) => setRetailForm({ ...retailForm, category: e.target.value })}
                  options={[
                    { value: 'Chairs', label: 'Chairs' },
                    { value: 'Tables', label: 'Tables' },
                    { value: 'Lighting', label: 'Lighting' },
                    { value: 'Storage', label: 'Storage' },
                    { value: 'Sofas', label: 'Sofas' },
                    { value: 'Objects', label: 'Objects' },
                  ]}
                />
                <TextInput
                  id="ret-price"
                  type="number"
                  label="Price (INR)"
                  required
                  value={retailForm.price}
                  onChange={(e) => setRetailForm({ ...retailForm, price: e.target.value })}
                />
              </div>

              <TextInput
                id="ret-image"
                label="Product Image URL"
                value={retailForm.image}
                onChange={(e) => setRetailForm({ ...retailForm, image: e.target.value })}
              />

              <TextInput
                id="ret-materials"
                label="Materials"
                value={retailForm.materials}
                onChange={(e) => setRetailForm({ ...retailForm, materials: e.target.value })}
              />

              <TextArea
                id="ret-desc"
                label="Description"
                rows={3}
                value={retailForm.description}
                onChange={(e) => setRetailForm({ ...retailForm, description: e.target.value })}
              />

              <div className="pt-2 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="Secondary-Outline"
                  label="Cancel"
                  onClick={() => setRetailModalOpen(false)}
                />
                <Button type="submit" variant="Primary" label="Save Edition" />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Enquiry Details */}
      {viewEnquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-md p-6 sm:p-8 max-w-lg w-full space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-abhaya text-2xl font-medium text-ink">
                Enquiry Details
              </h3>
              <button
                type="button"
                onClick={() => setViewEnquiryModal(null)}
                className="p-1 text-muted hover:text-ink"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-muted block">Client Name</span>
                <span className="font-medium text-ink text-sm">{viewEnquiryModal.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted block">Email</span>
                  <a href={`mailto:${viewEnquiryModal.email}`} className="text-ink underline">
                    {viewEnquiryModal.email}
                  </a>
                </div>
                <div>
                  <span className="text-muted block">Phone</span>
                  <a href={`tel:${viewEnquiryModal.phone}`} className="text-ink underline font-mono">
                    {viewEnquiryModal.phone}
                  </a>
                </div>
              </div>
              <div>
                <span className="text-muted block">Scope or Brief</span>
                <p className="p-3 bg-surface border border-border text-ink rounded-sm mt-1 whitespace-pre-line leading-relaxed">
                  {viewEnquiryModal.message || 'No specific text provided.'}
                </p>
              </div>
              <div>
                <span className="text-muted block">Source Route</span>
                <span className="font-mono text-muted">{viewEnquiryModal.sourceRoute || '/'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="Secondary-Outline"
                label="Close"
                onClick={() => setViewEnquiryModal(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

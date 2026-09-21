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
} from 'react-icons/lu';
import adminApi from '../api/adminOrders.api';
import { getProjects } from '../../projects/api/projects.api';
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
  const [retailModalOpen, setRetailModalOpen] = useState(false);
  const [viewEnquiryModal, setViewEnquiryModal] = useState(null);

  // Form states
  const [projectForm, setProjectForm] = useState({
    title: '',
    category: 'Residential',
    location: 'New Delhi, India',
    year: '2024',
    area: '4,500 sq.ft.',
    coverImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
    description: '',
  });

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
        getProjects(),
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

  const handleCreateProject = async (e) => {
    e.preventDefault();
    const newProject = {
      ...projectForm,
      id: `proj-${Date.now()}`,
      slug: projectForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    };
    try {
      await adminApi.createProject(newProject);
    } catch {
      // Local optimistic fallback
    }
    setProjects((prev) => [newProject, ...prev]);
    setProjectModalOpen(false);
    setProjectForm({
      title: '',
      category: 'Residential',
      location: 'New Delhi, India',
      year: '2024',
      area: '4,500 sq.ft.',
      coverImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
      description: '',
    });
  };

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
              onClick={() => setProjectModalOpen(true)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-muted uppercase tracking-wider border-y border-border">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-surface/50">
                    <td className="py-3 px-4 font-medium text-ink font-inter">
                      {proj.title}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">{proj.category}</Badge>
                    </td>
                    <td className="py-3 px-4 text-muted">{proj.location}</td>
                    <td className="py-3 px-4 text-muted font-mono">{proj.year}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id)}
                        className="p-1 text-muted hover:text-error transition-colors"
                        title="Delete project"
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

      {/* Modal: Add Project */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-md p-6 sm:p-8 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-abhaya text-2xl font-medium text-ink">
                Add Architectural Project
              </h3>
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
                className="p-1 text-muted hover:text-ink"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <TextInput
                id="proj-title"
                label="Project Title"
                required
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                placeholder="e.g. Vasant Vihar Courtyard Residence"
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="proj-category"
                  label="Category"
                  value={projectForm.category}
                  onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                  options={[
                    { value: 'Residential', label: 'Residential' },
                    { value: 'Commercial', label: 'Commercial' },
                    { value: 'Hospitality', label: 'Hospitality' },
                  ]}
                />
                <TextInput
                  id="proj-year"
                  label="Completion Year"
                  value={projectForm.year}
                  onChange={(e) => setProjectForm({ ...projectForm, year: e.target.value })}
                  placeholder="2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  id="proj-location"
                  label="Location"
                  value={projectForm.location}
                  onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                  placeholder="New Delhi, India"
                />
                <TextInput
                  id="proj-area"
                  label="Built Area"
                  value={projectForm.area}
                  onChange={(e) => setProjectForm({ ...projectForm, area: e.target.value })}
                  placeholder="5,200 sq.ft."
                />
              </div>

              <TextInput
                id="proj-image"
                label="Cover Image URL"
                value={projectForm.coverImage}
                onChange={(e) => setProjectForm({ ...projectForm, coverImage: e.target.value })}
              />

              <TextArea
                id="proj-desc"
                label="Architectural Concept"
                rows={3}
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Describe spatial concept, lighting, and materiality..."
              />

              <div className="pt-2 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="Secondary-Outline"
                  label="Cancel"
                  onClick={() => setProjectModalOpen(false)}
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

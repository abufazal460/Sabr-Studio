import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LuUpload,
} from 'react-icons/lu';
import adminApi from '../api/adminRetail.api';
import { getProjects } from '../../projects/api/projects.api';
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
  const navigate = useNavigate();
  // Single source of truth: URL. /admin = All Operations (overview);
  // sub-routes preselect their tab, tabs navigate back to the same routes
  // the sidebar/hamburger already use — all three stay synchronized.
  const [activeTab, setActiveTab] = useState('retail');
  const [loading, setLoading] = useState(true);

  // Data states
  const [projects, setProjects] = useState([]);
  const [retailItems, setRetailItems] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [orders, setOrders] = useState([]);

  // Filter states for retail
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');

  // Modal & operation states
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [retailModalOpen, setRetailModalOpen] = useState(false);
  const [editingRetailId, setEditingRetailId] = useState(null);
  const [savingRetail, setSavingRetail] = useState(false);
  const [deletingRetailId, setDeletingRetailId] = useState(null);
  const [togglingStockId, setTogglingStockId] = useState(null);
  const [togglingPublishId, setTogglingPublishId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const emptyRetailForm = {
    title: '',
    category: 'Chair',
    customCategory: '',
    price: '',
    image: '',
    description: '',
    dimensions: '',
    materials: '',
    inStock: true,
    published: true,
  };

  const [retailForm, setRetailForm] = useState(emptyRetailForm);

  const getRecordId = (record) =>
    record?.id || record?._id?.toString?.() || record?._id || record?.orderNumber;

  const getItemId = (item) => String(item?._id || item?.id || '').trim();

  const standardCats = ['Chair', 'Table', 'Lighting', 'Storage', 'Sofa', 'Decor', 'Objects'];
  const availableCategories = [
    'All',
    ...Array.from(new Set(retailItems.map((r) => r.category?.trim()).filter(Boolean))),
  ];
  const mergedCats = Array.from(
    new Set([...standardCats, ...retailItems.map((r) => r.category?.trim()).filter(Boolean)])
  );
  const selectOptions = [
    ...mergedCats.map((c) => ({ value: c, label: c })),
    { value: '__custom__', label: '+ Add New Category...' },
  ];

  const filteredRetailItems = retailItems.filter((item) => {
    if (
      categoryFilter !== 'All' &&
      (item.category || '').trim().toLowerCase() !== categoryFilter.trim().toLowerCase()
    ) {
      return false;
    }
    const isInStock = item.inStock !== false && item.availability !== false;
    if (stockFilter === 'inStock' && !isInStock) return false;
    if (stockFilter === 'outOfStock' && isInStock) return false;
    return true;
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [projRes, retRes, enqRes, ordRes] = await Promise.allSettled([
        getProjects(),
        adminApi.getRetailItems(),
        adminApi.getEnquiries(),
        adminApi.getOrders(),
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data) {
        setProjects(Array.isArray(projRes.value.data) ? projRes.value.data : []);
      }
      if (retRes.status === 'fulfilled') {
        const val = retRes.value;
        const items = Array.isArray(val?.data) ? val.data : (Array.isArray(val) ? val : []);
        setRetailItems(items);
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

  const openCreateRetailModal = () => {
    setEditingRetailId(null);
    setRetailForm(emptyRetailForm);
    setRetailModalOpen(true);
  };

  const openEditRetailModal = (item) => {
    const id = getItemId(item);
    if (!id) return;
    setEditingRetailId(id);
    const cat = item.category || 'Chair';
    const isStandardCat = ['Chair', 'Table', 'Lighting', 'Storage', 'Sofa', 'Decor', 'Objects', 'Chairs', 'Tables', 'Sofas'].includes(cat);
    setRetailForm({
      title: item.title || '',
      category: isStandardCat ? cat : '__custom__',
      customCategory: isStandardCat ? '' : cat,
      price: item.price !== undefined && item.price !== null ? item.price : '',
      image: item.image || (Array.isArray(item.images) && item.images[0]?.url) || '',
      description: item.description || '',
      dimensions: item.dimensions || '',
      materials: item.materials || '',
      inStock: item.inStock !== false && item.availability !== false,
      published: Boolean(item.published),
    });
    setRetailModalOpen(true);
  };

  const handleSaveRetail = async (e) => {
    e.preventDefault();
    if (savingRetail) return;

    if (!retailForm.title || !retailForm.title.trim()) {
      window.alert('Piece title is required.');
      return;
    }
    if (retailForm.price === '' || isNaN(Number(retailForm.price)) || Number(retailForm.price) < 0) {
      window.alert('A valid non-negative price is required.');
      return;
    }
    if (!retailForm.description || !retailForm.description.trim()) {
      window.alert('Product description is required.');
      return;
    }

    const finalCategory = (
      retailForm.category === '__custom__'
        ? retailForm.customCategory
        : retailForm.category
    )?.trim() || 'Chair';

    const payload = {
      title: retailForm.title.trim(),
      category: finalCategory,
      price: Number(retailForm.price),
      description: retailForm.description.trim(),
      image: retailForm.image?.trim() || '',
      images: retailForm.image?.trim() ? [{ url: retailForm.image.trim(), publicId: '' }] : [],
      dimensions: retailForm.dimensions?.trim() || '',
      materials: retailForm.materials?.trim() || '',
      inStock: Boolean(retailForm.inStock),
      availability: Boolean(retailForm.inStock),
      published: Boolean(retailForm.published),
    };

    setSavingRetail(true);
    try {
      if (editingRetailId) {
        const res = await adminApi.updateRetailItem(editingRetailId, payload);
        const saved = res?.data || res;
        setRetailItems((prev) =>
          prev.map((item) =>
            getItemId(item) === editingRetailId
              ? { ...item, ...(saved || payload), id: editingRetailId, _id: editingRetailId }
              : item
          )
        );
      } else {
        const res = await adminApi.createRetailItem(payload);
        const saved = res?.data || res;
        const normalized = saved
          ? { ...saved, id: getItemId(saved), _id: getItemId(saved) }
          : { ...payload, id: `retail-${Date.now()}`, _id: `retail-${Date.now()}` };
        setRetailItems((prev) => [normalized, ...prev]);
      }
      setRetailModalOpen(false);
      setEditingRetailId(null);
      setRetailForm(emptyRetailForm);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save retail edition.';
      window.alert(msg);
    } finally {
      setSavingRetail(false);
    }
  };

  const handleDeleteProject = (id) => {
    if (!window.confirm('Delete this project from catalog?')) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    adminApi.deleteProject(id).catch(() => {});
  };

  const handleDeleteRetail = async (id) => {
    const targetId = String(id || '').trim();
    if (!targetId || targetId === 'undefined' || deletingRetailId) return;
    if (!window.confirm('Delete this retail item from catalog? This will remove only this product.')) return;

    setDeletingRetailId(targetId);
    try {
      await adminApi.deleteRetailItem(targetId);
      setRetailItems((prev) => prev.filter((r) => getItemId(r) !== targetId));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete retail item. Please try again.';
      window.alert(msg);
    } finally {
      setDeletingRetailId(null);
    }
  };

  const handleToggleRetailStock = async (item) => {
    const targetId = getItemId(item);
    if (!targetId || targetId === 'undefined' || togglingStockId) return;

    const currentStock = item.inStock !== false && item.availability !== false;
    const newStock = !currentStock;

    // Optimistically update ONLY target item in state
    setRetailItems((prev) =>
      prev.map((r) =>
        getItemId(r) === targetId ? { ...r, inStock: newStock, availability: newStock } : r
      )
    );

    setTogglingStockId(targetId);
    try {
      await adminApi.updateRetailItem(targetId, {
        inStock: newStock,
        availability: newStock,
      });
    } catch (err) {
      // Rollback on failure
      setRetailItems((prev) =>
        prev.map((r) =>
          getItemId(r) === targetId ? { ...r, inStock: currentStock, availability: currentStock } : r
        )
      );
      const msg = err?.response?.data?.message || err?.message || 'Failed to update stock status.';
      window.alert(msg);
    } finally {
      setTogglingStockId(null);
    }
  };

  const handleToggleRetailPublish = async (item) => {
    const targetId = getItemId(item);
    if (!targetId || targetId === 'undefined' || togglingPublishId) return;

    const currentPublished = Boolean(item.published);
    const newPublished = !currentPublished;

    // Optimistically update ONLY target item in state
    setRetailItems((prev) =>
      prev.map((r) =>
        getItemId(r) === targetId ? { ...r, published: newPublished } : r
      )
    );

    setTogglingPublishId(targetId);
    try {
      await adminApi.updateRetailItem(targetId, {
        published: newPublished,
      });
    } catch (err) {
      // Rollback on failure
      setRetailItems((prev) =>
        prev.map((r) =>
          getItemId(r) === targetId ? { ...r, published: currentPublished } : r
        )
      );
      const msg = err?.response?.data?.message || err?.message || 'Failed to update publication status.';
      window.alert(msg);
    } finally {
      setTogglingPublishId(null);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result;
      try {
        setUploadingImage(true);
        const res = await adminApi.uploadImage({ dataUri, filename: file.name });
        const uploaded = res?.data?.images?.[0] || res?.images?.[0];
        if (uploaded?.url) {
          setRetailForm((prev) => ({ ...prev, image: uploaded.url }));
        }
      } catch (err) {
        window.alert(err?.message || 'Failed to upload image.');
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUpdateEnquiryStatus = (id, newStatus) => {
    const recordId = String(id || '').trim();
    if (!recordId || recordId === 'undefined') return;
    setEnquiries((prev) =>
      prev.map((enq) =>
        getRecordId(enq) === recordId ? { ...enq, status: newStatus } : enq
      )
    );
    adminApi.updateEnquiryStatus(recordId, newStatus).catch(() => {
      loadAllData();
    });
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
            onClick={() => {
              setActiveTab(tab.id);
              navigate(tab.id === 'overview' ? '/admin' : `/admin/${tab.id}`);
            }}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                onClick={openCreateRetailModal}
              />
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted font-medium mr-1">
                  Category:
                </span>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs tracking-wider transition-colors border ${
                      categoryFilter.toLowerCase() === cat.toLowerCase()
                        ? 'bg-black text-white border-black font-medium'
                        : 'bg-white text-muted border-border hover:border-black hover:text-ink'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                  Stock:
                </span>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="text-xs border border-border bg-white px-2.5 py-1 text-ink focus:border-black outline-none"
                >
                  <option value="All">All Stock</option>
                  <option value="inStock">In Stock Only</option>
                  <option value="outOfStock">Sold Out Only</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-muted uppercase tracking-wider border-y border-border">
                  <tr>
                    <th className="py-3 px-4">Edition</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price (INR)</th>
                    <th className="py-3 px-4">Stock Status</th>
                    <th className="py-3 px-4">Visibility</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRetailItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-muted">
                        No retail items found matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRetailItems.map((item, idx) => {
                      const itemId = getItemId(item);
                      const isInStock = item.inStock !== false && item.availability !== false;
                      const isPublished = Boolean(item.published);
                      const isTogglingStock = togglingStockId === itemId;
                      const isTogglingPublish = togglingPublishId === itemId;
                      const isDeleting = deletingRetailId === itemId;

                      return (
                        <tr key={itemId || `item-${idx}`} className="hover:bg-surface/50">
                          <td className="py-3 px-4 font-medium text-ink font-inter">
                            <div className="flex items-center space-x-3">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-9 h-9 object-cover rounded-xs border border-border shrink-0"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <span className="truncate max-w-xs">{item.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="default">{item.category || 'Retail'}</Badge>
                          </td>
                          <td className="py-3 px-4 font-inter text-ink">
                            {formatPrice(item.price)}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              disabled={isTogglingStock}
                              onClick={() => handleToggleRetailStock(item)}
                              className="cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                              title="Click to toggle In Stock / Sold Out"
                            >
                              {isInStock ? (
                                <Badge variant="success">
                                  {isTogglingStock ? 'Updating...' : 'In Stock'}
                                </Badge>
                              ) : (
                                <Badge variant="error">
                                  {isTogglingStock ? 'Updating...' : 'Sold Out'}
                                </Badge>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              disabled={isTogglingPublish}
                              onClick={() => handleToggleRetailPublish(item)}
                              className="cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 inline-flex items-center space-x-1"
                              title="Click to toggle Published / Draft"
                            >
                              {isPublished ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-medium bg-black text-white rounded-xs">
                                  <LuEye className="w-3 h-3" />
                                  <span>{isTogglingPublish ? '...' : 'Published'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-medium border border-border text-muted bg-white rounded-xs">
                                  <LuEyeOff className="w-3 h-3" />
                                  <span>{isTogglingPublish ? '...' : 'Draft'}</span>
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditRetailModal(item)}
                              className="p-1 text-muted hover:text-black transition-colors"
                              title="Edit edition"
                            >
                              <LuPencil className="w-4 h-4 inline" />
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteRetail(itemId)}
                              className="p-1 text-muted hover:text-error transition-colors disabled:opacity-50"
                              title="Delete edition"
                            >
                              <LuTrash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
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
                    <tr key={getRecordId(enq)} className="hover:bg-surface/50">
                      <td className="py-3 px-4 font-medium text-ink">{enq.name}</td>
                      <td className="py-3 px-4 text-muted">{enq.email}</td>
                      <td className="py-3 px-4 font-mono text-muted">{enq.phone}</td>
                      <td className="py-3 px-4 text-muted max-w-xs truncate">
                        {enq.message || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={enq.status || 'new'}
                          onChange={(e) => handleUpdateEnquiryStatus(getRecordId(enq), e.target.value)}
                          className="text-xs border border-border bg-white px-2 py-1 rounded-none text-ink"
                        >
                          <option value="new">New</option>
                          <option value="in-progress">In Review</option>
                          <option value="resolved">Resolved</option>
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

      {/* Modal: Add / Edit Retail Item */}
      {retailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white border border-border rounded-md p-6 sm:p-8 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="font-abhaya text-2xl font-medium text-ink">
                  {editingRetailId ? 'Edit Bespoke Retail Edition' : 'Add Bespoke Retail Edition'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setRetailModalOpen(false);
                    setEditingRetailId(null);
                    setRetailForm(emptyRetailForm);
                  }}
                  className="p-1 text-muted hover:text-ink"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRetail} className="space-y-4">
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
                    options={selectOptions}
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

                {retailForm.category === '__custom__' && (
                  <TextInput
                    id="ret-custom-cat"
                    label="New Category Name"
                    required
                    value={retailForm.customCategory}
                    onChange={(e) =>
                      setRetailForm({ ...retailForm, customCategory: e.target.value })
                    }
                    placeholder="e.g. Architectural Hardware"
                  />
                )}

                <div className="space-y-1.5">
                  <TextInput
                    id="ret-image"
                    label="Product Image URL"
                    value={retailForm.image}
                    onChange={(e) => setRetailForm({ ...retailForm, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                  />
                  <div className="flex items-center space-x-2">
                    <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-border bg-surface text-ink text-xs font-medium cursor-pointer hover:border-black transition-colors">
                      <LuUpload className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-muted">Or enter URL above</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextInput
                    id="ret-dimensions"
                    label="Dimensions"
                    value={retailForm.dimensions}
                    onChange={(e) => setRetailForm({ ...retailForm, dimensions: e.target.value })}
                    placeholder="600mm W × 580mm D × 740mm H"
                  />
                  <TextInput
                    id="ret-materials"
                    label="Materials"
                    value={retailForm.materials}
                    onChange={(e) => setRetailForm({ ...retailForm, materials: e.target.value })}
                    placeholder="Solid Ash timber, Belgian linen"
                  />
                </div>

                <TextArea
                  id="ret-desc"
                  label="Description"
                  required
                  rows={3}
                  value={retailForm.description}
                  onChange={(e) => setRetailForm({ ...retailForm, description: e.target.value })}
                  placeholder="Describe craftsmanship, materiality, and finish..."
                />

                <div className="flex flex-wrap items-center gap-6 pt-1 border-t border-border/60">
                  <label className="flex items-center space-x-2 text-xs text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={retailForm.inStock}
                      onChange={(e) => setRetailForm({ ...retailForm, inStock: e.target.checked })}
                      className="rounded-none border-border text-black focus:ring-black h-4 w-4"
                    />
                    <span className="font-medium">In Stock</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={retailForm.published}
                      onChange={(e) =>
                        setRetailForm({ ...retailForm, published: e.target.checked })
                      }
                      className="rounded-none border-border text-black focus:ring-black h-4 w-4"
                    />
                    <span className="font-medium">Publish to Catalog</span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="Secondary-Outline"
                    label="Cancel"
                    onClick={() => {
                      setRetailModalOpen(false);
                      setEditingRetailId(null);
                      setRetailForm(emptyRetailForm);
                    }}
                  />
                  <Button
                    type="submit"
                    variant="Primary"
                    disabled={savingRetail || uploadingImage}
                    label={
                      savingRetail
                        ? 'Saving...'
                        : editingRetailId
                        ? 'Update Edition'
                        : 'Save Edition'
                    }
                  />
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

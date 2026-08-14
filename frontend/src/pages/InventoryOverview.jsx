/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react';
import Icon from '../components/Icons';
import { createProduct, updateProduct } from '../api';
import {
  formatNumber, formatCurrency, getStockStatus, getStockStatusLabel,
  formatDateOnly, getExpiryStatus, getExpiryStatusLabel,
} from '../utils';
import './InventoryOverview.css';

const EMPTY_FORM = {
  product_name: '',
  category: '',
  unit_price: '',
  current_stock: '',
  minimum_threshold: '',
  safety_stock: '',
  reorder_quantity: '',
  expiry_date: '',
};

export default function InventoryOverview({ products, onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  /* ── Product Form State ─────────────────────────────── */
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set();
    products?.forEach(p => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesSearch = !search || p.product_name.toLowerCase().includes(search.toLowerCase());
      const status = getStockStatus(p.current_stock, p.minimum_threshold);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || (p.category || 'Uncategorized') === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, search, statusFilter, categoryFilter]);

  const statusCounts = useMemo(() => {
    if (!products) return { healthy: 0, 'low-stock': 0, 'out-of-stock': 0 };
    const counts = { healthy: 0, 'low-stock': 0, 'out-of-stock': 0 };
    products.forEach(p => {
      counts[getStockStatus(p.current_stock, p.minimum_threshold)]++;
    });
    return counts;
  }, [products]);

  /* ── Form Handlers ──────────────────────────────────── */
  const openCreateForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingId(product.product_id);
    setFormData({
      product_name: product.product_name || '',
      category: product.category || '',
      unit_price: product.unit_price != null ? String(product.unit_price) : '',
      current_stock: String(product.current_stock ?? ''),
      minimum_threshold: product.minimum_threshold != null ? String(product.minimum_threshold) : '',
      safety_stock: product.safety_stock != null ? String(product.safety_stock) : '',
      reorder_quantity: product.reorder_quantity != null ? String(product.reorder_quantity) : '',
      expiry_date: product.expiry_date || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async () => {
    if (!formData.product_name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      const payload = {};
      payload.product_name = formData.product_name.trim();
      if (formData.category.trim()) payload.category = formData.category.trim();
      if (formData.unit_price !== '') payload.unit_price = parseFloat(formData.unit_price);
      if (formData.minimum_threshold !== '') payload.minimum_threshold = parseInt(formData.minimum_threshold, 10);
      if (formData.safety_stock !== '') payload.safety_stock = parseInt(formData.safety_stock, 10);
      if (formData.reorder_quantity !== '') payload.reorder_quantity = parseInt(formData.reorder_quantity, 10);
      if (formData.expiry_date) payload.expiry_date = formData.expiry_date;
      else payload.expiry_date = null;

      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        if (formData.current_stock !== '') payload.current_stock = parseInt(formData.current_stock, 10);
        await createProduct(payload);
      }

      closeForm();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="inventory-page">
      {/* Stats Bar */}
      <div className="inv-stats-bar">
        <div className="inv-stat">
          <span className="inv-stat-dot healthy" />
          <span className="inv-stat-label">Healthy</span>
          <span className="inv-stat-count">{statusCounts.healthy}</span>
        </div>
        <div className="inv-stat">
          <span className="inv-stat-dot low-stock" />
          <span className="inv-stat-label">Low Stock</span>
          <span className="inv-stat-count">{statusCounts['low-stock']}</span>
        </div>
        <div className="inv-stat">
          <span className="inv-stat-dot out-of-stock" />
          <span className="inv-stat-label">Out of Stock</span>
          <span className="inv-stat-count">{statusCounts['out-of-stock']}</span>
        </div>
        <button className="inv-add-btn" onClick={openCreateForm}>
          <Icon name="plus" size={15} />
          Add Product
        </button>
      </div>

      {/* Product Form Card */}
      {showForm && (
        <div className="inv-card inv-form-card">
          <div className="inv-form-header">
            <h3 className="inv-form-title">
              <Icon name={editingId ? 'edit' : 'plus'} size={16} color="var(--primary)" />
              {editingId ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button className="inv-form-close" onClick={closeForm}>
              <Icon name="x" size={16} />
            </button>
          </div>

          {formError && (
            <div className="inv-form-error">
              <Icon name="xCircle" size={14} />
              {formError}
            </div>
          )}

          <div className="inv-form-grid">
            <div className="inv-form-field">
              <label>Product Name *</label>
              <input
                type="text"
                placeholder="Product name"
                value={formData.product_name}
                onChange={(e) => handleFormChange('product_name', e.target.value)}
                disabled={formSubmitting}
              />
            </div>
            <div className="inv-form-field">
              <label>Category</label>
              <input
                type="text"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => handleFormChange('category', e.target.value)}
                disabled={formSubmitting}
              />
            </div>
            <div className="inv-form-field">
              <label>Unit Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={formData.unit_price}
                onChange={(e) => handleFormChange('unit_price', e.target.value)}
                disabled={formSubmitting}
              />
            </div>
            {!editingId && (
              <div className="inv-form-field">
                <label>Current Stock</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.current_stock}
                  onChange={(e) => handleFormChange('current_stock', e.target.value)}
                  disabled={formSubmitting}
                />
              </div>
            )}
            <div className="inv-form-field">
              <label>Min Threshold</label>
              <input
                type="number"
                min="0"
                placeholder="10"
                value={formData.minimum_threshold}
                onChange={(e) => handleFormChange('minimum_threshold', e.target.value)}
                disabled={formSubmitting}
              />
            </div>
            <div className="inv-form-field">
              <label>Safety Stock</label>
              <input
                type="number"
                min="0"
                placeholder="5"
                value={formData.safety_stock}
                onChange={(e) => handleFormChange('safety_stock', e.target.value)}
                disabled={formSubmitting}
              />
            </div>
            <div className="inv-form-field">
              <label>Reorder Qty</label>
              <input
                type="number"
                min="1"
                placeholder="50"
                value={formData.reorder_quantity}
                onChange={(e) => handleFormChange('reorder_quantity', e.target.value)}
                disabled={formSubmitting}
              />
            </div>
            <div className="inv-form-field">
              <label>Expiry Date</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleFormChange('expiry_date', e.target.value)}
                disabled={formSubmitting}
              />
            </div>
          </div>

          <div className="inv-form-actions">
            <button className="inv-form-cancel" onClick={closeForm} disabled={formSubmitting}>
              Cancel
            </button>
            <button className="inv-form-submit" onClick={handleFormSubmit} disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : (editingId ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="inv-card">
        <div className="inv-filters">
          <div className="inv-search-wrap">
            <Icon name="search" size={16} className="inv-search-icon" />
            <input
              type="text"
              className="inv-search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="inv-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>

          <select
            className="inv-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <span className="inv-result-count">
            {filtered.length} of {products?.length || 0} products
          </span>
        </div>

        {/* Table */}
        <div className="inv-table-wrap">
          {filtered.length === 0 ? (
            <div className="inv-empty">
              <Icon name="package" size={32} color="var(--text-light)" />
              <p>No products found matching your filters.</p>
            </div>
          ) : (
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Min Threshold</th>
                  <th>Safety Stock</th>
                  <th>Reorder Qty</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                  <th>Expiry Date</th>
                  <th>Expiry Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const status = getStockStatus(p.current_stock, p.minimum_threshold);
                  const statusLabel = getStockStatusLabel(p.current_stock, p.minimum_threshold);
                  const expiryStatus = getExpiryStatus(p.expiry_date);
                  const expiryLabel = getExpiryStatusLabel(p.expiry_date);
                  return (
                    <tr key={p.product_id}>
                      <td className="inv-product-name">{p.product_name}</td>
                      <td className="inv-category">{p.category || '—'}</td>
                      <td className={`inv-stock inv-stock-${status}`}>{formatNumber(p.current_stock)}</td>
                      <td>{formatNumber(p.minimum_threshold)}</td>
                      <td>{formatNumber(p.safety_stock)}</td>
                      <td>{formatNumber(p.reorder_quantity)}</td>
                      <td>{formatCurrency(p.unit_price)}</td>
                      <td>
                        <span className={`inv-badge inv-badge-${status}`}>{statusLabel}</span>
                      </td>
                      <td className="inv-expiry-date">{formatDateOnly(p.expiry_date)}</td>
                      <td>
                        {expiryStatus ? (
                          <span className={`inv-badge inv-badge-${expiryStatus}`}>{expiryLabel}</span>
                        ) : (
                          <span className="inv-no-expiry">—</span>
                        )}
                      </td>
                      <td>
                        <button className="inv-edit-btn" onClick={() => openEditForm(p)} title="Edit product">
                          <Icon name="edit" size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

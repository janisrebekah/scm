/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react';
import Icon from '../components/Icons';
import { formatNumber, formatCurrency, getStockStatus, getStockStatusLabel } from '../utils';
import './InventoryOverview.css';

export default function InventoryOverview({ products }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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
      </div>

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
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const status = getStockStatus(p.current_stock, p.minimum_threshold);
                  const statusLabel = getStockStatusLabel(p.current_stock, p.minimum_threshold);
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

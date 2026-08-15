/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react';
import Icon from '../components/Icons';
import { formatDate, productName } from '../utils';
import './AlertsHistory.css';

const SEVERITY_STYLE = {
  CRITICAL: { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-border)' },
  HIGH: { color: 'var(--orange)', bg: 'var(--orange-bg)', border: 'rgba(249,115,22,0.25)' },
  MEDIUM: { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
  LOW: { color: 'var(--info)', bg: 'var(--info-bg)', border: 'var(--info-border)' },
};

const STATUS_STYLE = {
  ACTIVE: { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
  RESOLVED: { color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
};

const TYPE_STYLE = {
  OUT_OF_STOCK: { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-border)', label: 'Out of Stock' },
  LOW_STOCK: { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', label: 'Low Stock' },
};

export default function AlertsHistory({ history }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    if (!history) return [];
    return history.filter(a => {
      const name = productName(a).toLowerCase();
      const matchesSearch = !search || name.includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchesType = typeFilter === 'all' || a.alert_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [history, search, statusFilter, typeFilter]);

  // Summary counts
  const totalCount = history?.length || 0;
  const activeCount = history?.filter(a => a.status === 'ACTIVE').length || 0;
  const resolvedCount = history?.filter(a => a.status === 'RESOLVED').length || 0;

  return (
    <div className="history-page">
      {/* Stats */}
      <div className="history-stats-bar">
        <div className="history-stat">
          <Icon name="bell" size={15} color="var(--primary)" />
          <span className="history-stat-count">{totalCount}</span>
          <span className="history-stat-label">Total Alerts</span>
        </div>
        <div className="history-stat">
          <span className="history-stat-dot" style={{ background: 'var(--warning)' }} />
          <span className="history-stat-count">{activeCount}</span>
          <span className="history-stat-label">Active</span>
        </div>
        <div className="history-stat">
          <span className="history-stat-dot" style={{ background: 'var(--success)' }} />
          <span className="history-stat-count">{resolvedCount}</span>
          <span className="history-stat-label">Resolved</span>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="history-card">
        <div className="history-filters">
          <div className="history-search-wrap">
            <Icon name="search" size={16} className="history-search-icon" />
            <input
              type="text"
              className="history-search"
              placeholder="Search by product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="history-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            className="history-filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          <span className="history-result-count">
            {filtered.length} of {totalCount} alerts
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="history-empty">
            <Icon name="inbox" size={32} color="var(--text-light)" />
            <p>No alerts found matching your filters.</p>
          </div>
        ) : (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Alert Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Details</th>
                  <th>Created At</th>
                  <th>Resolved At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const sev = SEVERITY_STYLE[a.severity] || {};
                  const stat = STATUS_STYLE[a.status] || {};
                  const typeInfo = TYPE_STYLE[a.alert_type] || {};
                  return (
                    <tr key={a.alert_id}>
                      <td className="history-product">{productName(a)}</td>
                      <td>
                        <span
                          className="history-badge"
                          style={{
                            color: typeInfo.color,
                            background: typeInfo.bg,
                            borderColor: typeInfo.border,
                          }}
                        >
                          {typeInfo.label || a.alert_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span
                          className="history-badge"
                          style={{
                            color: sev.color,
                            background: sev.bg,
                            borderColor: sev.border,
                          }}
                        >
                          {a.severity}
                        </span>
                      </td>
                      <td>
                        <span
                          className="history-badge"
                          style={{
                            color: stat.color,
                            background: stat.bg,
                            borderColor: stat.border,
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="history-stock">{a.products?.current_stock ?? 'â€”'}</td>
                      <td className="history-stock">{a.products?.minimum_threshold ?? 'â€”'}</td>
                      <td className="history-message">{a.message}</td>
                      <td className="history-date">{formatDate(a.created_at)}</td>
                      <td className="history-date">{formatDate(a.resolved_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react';
import Icon from '../components/Icons';
import { formatDate, formatNumber, productName } from '../utils';
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

const SEVERITY_RANK = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function alertTypeLabel(type) {
  return TYPE_STYLE[type]?.label || type?.replaceAll('_', ' ') || '-';
}

function formatDuration(start, end) {
  if (!start || !end) return null;
  const diffMs = new Date(end) - new Date(start);
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function navigateToInventory() {
  const navButton = Array.from(document.querySelectorAll('.nav-item')).find((btn) => (
    btn.querySelector('.nav-label')?.textContent === 'Inventory Overview'
  ));
  navButton?.click();
}

export default function AlertsHistory({ history }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const alerts = useMemo(() => history || [], [history]);

  const activeAlerts = useMemo(() => (
    alerts
      .filter((alert) => alert.status === 'ACTIVE')
      .sort((a, b) => {
        const severityDiff = (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99);
        if (severityDiff !== 0) return severityDiff;
        const typeDiff = (a.alert_type === 'OUT_OF_STOCK' ? 0 : 1) - (b.alert_type === 'OUT_OF_STOCK' ? 0 : 1);
        if (typeDiff !== 0) return typeDiff;
        return (a.products?.current_stock ?? 999999) - (b.products?.current_stock ?? 999999);
      })
  ), [alerts]);

  const filteredLogs = useMemo(() => (
    alerts.filter((alert) => {
      const name = productName(alert).toLowerCase();
      const matchesSearch = !search || name.includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
  ), [alerts, search, statusFilter]);

  const totalCount = alerts.length;
  const activeCount = activeAlerts.length;
  const resolvedCount = alerts.filter((alert) => alert.status === 'RESOLVED').length;

  return (
    <div className="history-page">
      <section className="history-summary-grid" aria-label="Alert summary">
        <div className="history-summary-card">
          <div className="history-summary-icon history-summary-icon-total">
            <Icon name="bell" size={18} />
          </div>
          <div>
            <span>Total Alerts</span>
            <strong>{formatNumber(totalCount)}</strong>
          </div>
        </div>
        <div className="history-summary-card">
          <div className="history-summary-icon history-summary-icon-active">
            <Icon name="alertTriangle" size={18} />
          </div>
          <div>
            <span>Active Alerts</span>
            <strong>{formatNumber(activeCount)}</strong>
          </div>
        </div>
        <div className="history-summary-card">
          <div className="history-summary-icon history-summary-icon-resolved">
            <Icon name="checkCircle" size={18} />
          </div>
          <div>
            <span>Resolved Alerts</span>
            <strong>{formatNumber(resolvedCount)}</strong>
          </div>
        </div>
      </section>

      <section className="history-card history-attention-card">
        <div className="history-section-header">
          <div>
            <h3>Needs Attention</h3>
            <p>{activeCount > 0 ? `${formatNumber(activeCount)} active alerts require review` : 'No active alerts right now'}</p>
          </div>
          <button className="history-header-action" onClick={navigateToInventory}>
            Review Inventory <Icon name="arrowUpRight" size={13} />
          </button>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="history-clear-state">
            <Icon name="checkCircle" size={28} />
            <div>
              <strong>All clear</strong>
              <span>Resolved alerts remain available in Alert Logs.</span>
            </div>
          </div>
        ) : (
          <div className="history-attention-list">
            {activeAlerts.map((alert) => {
              const severity = SEVERITY_STYLE[alert.severity] || {};
              const typeInfo = TYPE_STYLE[alert.alert_type] || {};
              return (
                <article className="history-attention-item" key={alert.alert_id}>
                  <div className="history-attention-main">
                    <div className="history-alert-title">
                      <strong>{productName(alert)}</strong>
                      <span>{alertTypeLabel(alert.alert_type)}</span>
                    </div>
                    <div className="history-alert-meta">
                      <span
                        className="history-badge"
                        style={{ color: typeInfo.color, background: typeInfo.bg, borderColor: typeInfo.border }}
                      >
                        {alertTypeLabel(alert.alert_type)}
                      </span>
                      <span
                        className="history-badge"
                        style={{ color: severity.color, background: severity.bg, borderColor: severity.border }}
                      >
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                  <div className="history-attention-stock">
                    <div>
                      <span>Current Stock</span>
                      <strong>{formatNumber(alert.products?.current_stock)}</strong>
                    </div>
                    <div>
                      <span>Min Threshold</span>
                      <strong>{formatNumber(alert.products?.minimum_threshold)}</strong>
                    </div>
                  </div>
                 
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="history-card">
        <div className="history-section-header history-log-header">
          <div>
            <h3>Alert Logs</h3>
            <p>Complete alert history with lifecycle status</p>
          </div>
          <span className="history-result-count">{filteredLogs.length} of {totalCount} alerts</span>
        </div>

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
          <div className="history-status-tabs" aria-label="Filter alerts by status">
            {[
              ['all', 'All'],
              ['ACTIVE', 'Active'],
              ['RESOLVED', 'Resolved'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={statusFilter === value ? 'active' : ''}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
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
                  
                  <th>Status</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Created At</th>
                  <th>Resolved At</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((alert) => {
                  const severity = SEVERITY_STYLE[alert.severity] || {};
                  const status = STATUS_STYLE[alert.status] || {};
                  const typeInfo = TYPE_STYLE[alert.alert_type] || {};
                  const duration = formatDuration(alert.created_at, alert.resolved_at);
                  return (
                    <tr key={alert.alert_id}>
                      <td className="history-product">{productName(alert)}</td>
                      <td>
                        <span
                          className="history-badge"
                          style={{ color: typeInfo.color, background: typeInfo.bg, borderColor: typeInfo.border }}
                        >
                          {alertTypeLabel(alert.alert_type)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="history-badge"
                          style={{ color: severity.color, background: severity.bg, borderColor: severity.border }}
                        >
                          {alert.severity || '-'}
                        </span>
                      </td>
                      <td>
                        <span
                          className="history-badge"
                          style={{ color: status.color, background: status.bg, borderColor: status.border }}
                        >
                          {alert.status || '-'}
                        </span>
                      </td>
                      <td className="history-stock">{formatNumber(alert.products?.current_stock)}</td>
                      <td className="history-stock">{formatNumber(alert.products?.minimum_threshold)}</td>
                      <td className="history-date">{formatDate(alert.created_at)}</td>
                      <td className="history-date">
                        <span>{formatDate(alert.resolved_at)}</span>
                        {duration && <small>Resolved in {duration}</small>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

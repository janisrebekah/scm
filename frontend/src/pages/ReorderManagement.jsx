/* eslint-disable react/prop-types */
import { useState } from 'react';
import { updateReorderStatus } from '../api';
import Icon from '../components/Icons';
import { formatNumber, productName } from '../utils';
import './ReorderManagement.css';

const STATUS_STYLE = {
  PENDING: { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
  ORDERED: { color: 'var(--primary)', bg: 'var(--primary-bg)', border: 'rgba(124,92,252,0.25)' },
  COMPLETED: { color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
  CANCELLED: { color: 'var(--text-muted)', bg: 'var(--content-bg)', border: 'var(--card-border)' },
};

export default function ReorderManagement({ reorders, reorderSummary, onRefresh }) {
  const [updating, setUpdating] = useState(null);

  const handleStatusChange = async (recommendationId, newStatus) => {
    setUpdating(recommendationId);
    try {
      await updateReorderStatus(recommendationId, newStatus);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Failed to update reorder status:', err);
    } finally {
      setUpdating(null);
    }
  };

  const summary = reorderSummary || {
    pending_reorders: 0,
    ordered_reorders: 0,
    completed_reorders: 0,
    total_recommended_units: 0,
  };

  return (
    <div className="reorder-page">
      {/* Summary Cards */}
      <div className="reorder-summary-grid">
        <div className="reorder-summary-card">
          <div className="reorder-summary-icon" style={{ background: 'var(--warning-bg)' }}>
            <Icon name="clock" size={18} color="var(--warning)" />
          </div>
          <div className="reorder-summary-content">
            <div className="reorder-summary-value">{summary.pending_reorders}</div>
            <div className="reorder-summary-label">Pending</div>
          </div>
        </div>
        <div className="reorder-summary-card">
          <div className="reorder-summary-icon" style={{ background: 'var(--primary-bg)' }}>
            <Icon name="truck" size={18} color="var(--primary)" />
          </div>
          <div className="reorder-summary-content">
            <div className="reorder-summary-value">{summary.ordered_reorders}</div>
            <div className="reorder-summary-label">Ordered</div>
          </div>
        </div>
        <div className="reorder-summary-card">
          <div className="reorder-summary-icon" style={{ background: 'var(--success-bg)' }}>
            <Icon name="checkCircle" size={18} color="var(--success)" />
          </div>
          <div className="reorder-summary-content">
            <div className="reorder-summary-value">{summary.completed_reorders}</div>
            <div className="reorder-summary-label">Completed</div>
          </div>
        </div>
        <div className="reorder-summary-card">
          <div className="reorder-summary-icon" style={{ background: 'var(--info-bg)' }}>
            <Icon name="layers" size={18} color="var(--info)" />
          </div>
          <div className="reorder-summary-content">
            <div className="reorder-summary-value">{formatNumber(summary.total_recommended_units)}</div>
            <div className="reorder-summary-label">Total Rec. Units</div>
          </div>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="reorder-card">
        <div className="reorder-card-header">
          <h3 className="reorder-card-title">
            <Icon name="refreshCw" size={16} color="var(--primary)" />
            Reorder Recommendations
          </h3>
          <span className="reorder-count">{reorders?.length || 0} recommendations</span>
        </div>

        {!reorders || reorders.length === 0 ? (
          <div className="reorder-empty">
            <Icon name="inbox" size={36} color="var(--text-light)" />
            <p>No reorder recommendations at this time.</p>
          </div>
        ) : (
          <div className="reorder-table-wrap">
            <table className="reorder-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Avg Daily Demand</th>
                  <th>Lead Time</th>
                  <th>Safety Stock</th>
                  <th>Reorder Point</th>
                  <th>Rec. Quantity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reorders.map(r => {
                  const style = STATUS_STYLE[r.status] || {};
                  const isUpdating = updating === r.recommendation_id;
                  return (
                    <tr key={r.recommendation_id}>
                      <td className="reorder-product">{productName(r)}</td>
                      <td>{r.current_stock}</td>
                      <td>{r.average_daily_demand}</td>
                      <td>{r.lead_time_days}d</td>
                      <td>{r.safety_stock}</td>
                      <td>{r.reorder_point}</td>
                      <td className="reorder-rec-qty">{r.recommended_quantity}</td>
                      <td>
                        <span
                          className="reorder-badge"
                          style={{
                            color: style.color,
                            background: style.bg,
                            borderColor: style.border,
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div className="reorder-actions">
                          {r.status === 'PENDING' && (
                            <>
                              <button
                                className="reorder-action-btn ordered"
                                onClick={() => handleStatusChange(r.recommendation_id, 'ORDERED')}
                                disabled={isUpdating}
                                title="Mark as Ordered"
                              >
                                {isUpdating ? '...' : 'Order'}
                              </button>
                              <button
                                className="reorder-action-btn cancel"
                                onClick={() => handleStatusChange(r.recommendation_id, 'CANCELLED')}
                                disabled={isUpdating}
                                title="Cancel"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {r.status === 'ORDERED' && (
                            <button
                              className="reorder-action-btn complete"
                              onClick={() => handleStatusChange(r.recommendation_id, 'COMPLETED')}
                              disabled={isUpdating}
                              title="Mark as Completed"
                            >
                              {isUpdating ? '...' : 'Complete'}
                            </button>
                          )}
                          {(r.status === 'COMPLETED' || r.status === 'CANCELLED') && (
                            <span className="reorder-action-done">—</span>
                          )}
                        </div>
                      </td>
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

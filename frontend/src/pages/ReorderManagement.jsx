/* eslint-disable react/prop-types */
import { useState } from 'react';
import { updateReorderStatus, completeReorder, updateReorderQuantity } from '../api';
import Icon from '../components/Icons';
import { formatNumber, productName } from '../utils';
import './ReorderManagement.css';

export default function ReorderManagement({ reorders, reorderSummary, onRefresh }) {
  const [updating, setUpdating] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editError, setEditError] = useState('');

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

  const handleComplete = async (recommendationId) => {
    setUpdating(recommendationId);
    try {
      await completeReorder(recommendationId);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Failed to complete reorder:', err);
    } finally {
      setUpdating(null);
    }
  };

  const startEdit = (r) => {
    setEditingId(r.recommendation_id);
    setEditQty(String(r.recommended_quantity));
    setEditError('');
  };

  const cancelEdit = () => { setEditingId(null); setEditQty(''); setEditError(''); };

  const saveEdit = async (id) => {
    const qty = parseInt(editQty, 10);
    if (isNaN(qty) || qty <= 0) { setEditError('Must be positive'); return; }
    setUpdating(id); setEditError('');
    try {
      await updateReorderQuantity(id, qty);
      cancelEdit();
      if (onRefresh) await onRefresh();
    } catch (err) { setEditError(err.message); }
    finally { setUpdating(null); }
  };

  const summary = reorderSummary || { pending_reorders: 0, ordered_reorders: 0, completed_reorders: 0, total_recommended_units: 0 };

  const pendingOrdered = (reorders || []).filter(r => r.status === 'PENDING' || r.status === 'ORDERED');
  const completedCancelled = (reorders || []).filter(r => r.status === 'COMPLETED' || r.status === 'CANCELLED');

  return (
    <div className="ro-page">
      {/* ════ SUMMARY STAT CARDS ════ */}
      <section className="ro-stats-row">
        <div className="ro-stat ro-stat-pending">
          <strong>{formatNumber(summary.pending_reorders)}</strong>
          <span>Pending</span>
        </div>
        <div className="ro-stat ro-stat-ordered">
          <strong>{formatNumber(summary.ordered_reorders)}</strong>
          <span>Ordered</span>
        </div>
        <div className="ro-stat ro-stat-completed">
          <strong>{formatNumber(summary.completed_reorders)}</strong>
          <span>Completed</span>
        </div>
        <div className="ro-stat ro-stat-units">
          <strong>{formatNumber(summary.total_recommended_units)}</strong>
          <span>Total Units</span>
        </div>
      </section>

      {/* ════ TWO-PANEL LAYOUT ════ */}
      <section className="ro-layout">

        {/* ──── LEFT: RECOMMENDATIONS ──── */}
        <div className="ro-primary">
          <div className="ro-panel-header">
            <h3>Reorder Recommendations</h3>
            <span className="ro-badge-count">{pendingOrdered.length} actionable</span>
          </div>

          {pendingOrdered.length === 0 ? (
            <div className="ro-empty"><Icon name="checkCircle" size={24} /><div><strong>All caught up</strong><p>No pending or ordered reorder recommendations.</p></div></div>
          ) : (
            <div className="ro-rec-list">
              {pendingOrdered.map(r => {
                const isUpdating = updating === r.recommendation_id;
                const isEditing = editingId === r.recommendation_id;
                const target = (r.current_stock || 0) + (r.recommended_quantity || 0);
                return (
                  <article className="ro-rec-card" key={r.recommendation_id}>
                    <div className="ro-rec-top">
                      <div>
                        <h4>{productName(r)}</h4>
                        <span className={`ro-status-tag ${r.status.toLowerCase()}`}>{r.status}</span>
                      </div>
                      <div className="ro-rec-actions">
                        {r.status === 'PENDING' && (
                          <>
                            <button className="ro-action-btn order" onClick={() => handleStatusChange(r.recommendation_id, 'ORDERED')} disabled={isUpdating}>{isUpdating ? '...' : 'Order'}</button>
                            <button className="ro-action-btn cancel" onClick={() => handleStatusChange(r.recommendation_id, 'CANCELLED')} disabled={isUpdating}>Cancel</button>
                          </>
                        )}
                        {r.status === 'ORDERED' && (
                          <button className="ro-action-btn complete" onClick={() => handleComplete(r.recommendation_id)} disabled={isUpdating}>{isUpdating ? '...' : 'Complete'}</button>
                        )}
                      </div>
                    </div>

                    <div className="ro-rec-metrics">
                      <div className="ro-metric"><span>Current Stock</span><strong>{formatNumber(r.current_stock)}</strong></div>
                      <div className="ro-metric"><span>Reorder Point</span><strong>{formatNumber(r.reorder_point)}</strong></div>
                      <div className="ro-metric"><span>Safety Stock</span><strong>{formatNumber(r.safety_stock)}</strong></div>
                      <div className="ro-metric"><span>Lead Time</span><strong>{r.lead_time_days}d</strong></div>
                    </div>

                    <div className="ro-rec-bottom">
                      <div className="ro-recommend-box">
                        <span>Recommended:</span>
                        {isEditing ? (
                          <div className="ro-edit-inline">
                            <input
                              type="number" min="1"
                              className={editError ? 'error' : ''}
                              value={editQty}
                              onChange={(e) => { setEditQty(e.target.value); setEditError(''); }}
                              disabled={isUpdating}
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(r.recommendation_id); if (e.key === 'Escape') cancelEdit(); }}
                            />
                            <button className="ro-edit-save" onClick={() => saveEdit(r.recommendation_id)} disabled={isUpdating}><Icon name="checkCircle" size={13} /></button>
                            <button className="ro-edit-cancel" onClick={cancelEdit} disabled={isUpdating}><Icon name="x" size={13} /></button>
                            {editError && <span className="ro-edit-err">{editError}</span>}
                          </div>
                        ) : (
                          <strong>+{formatNumber(r.recommended_quantity)} units
                            <button className="ro-edit-btn" onClick={() => startEdit(r)} disabled={isUpdating} title="Edit quantity"><Icon name="edit" size={11} /></button>
                          </strong>
                        )}
                      </div>
                      <span className="ro-target-info">Target: {formatNumber(target)} units</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* ──── RIGHT: ORDER STATUS ──── */}
        <div className="ro-secondary">
          <div className="ro-panel-header">
            <h3>Order Status</h3>
          </div>

          {completedCancelled.length === 0 ? (
            <div className="ro-empty sm"><Icon name="inbox" size={20} /><div><strong>No history</strong></div></div>
          ) : (
            <div className="ro-status-list">
              {completedCancelled.map(r => (
                <div className="ro-status-row" key={r.recommendation_id}>
                  <div className="ro-status-info">
                    <strong>{productName(r)}</strong>
                    <span>{formatNumber(r.recommended_quantity)} units</span>
                  </div>
                  <span className={`ro-status-tag ${r.status.toLowerCase()}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

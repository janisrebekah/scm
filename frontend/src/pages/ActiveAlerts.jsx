/* eslint-disable react/prop-types */
import Icon from '../components/Icons';
import { formatDate, productName } from '../utils';
import './ActiveAlerts.css';

const SEVERITY_MAP = {
  CRITICAL: { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-border)' },
  HIGH: { color: 'var(--orange)', bg: 'var(--orange-bg)', border: 'rgba(249,115,22,0.25)' },
  MEDIUM: { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
  LOW: { color: 'var(--info)', bg: 'var(--info-bg)', border: 'var(--info-border)' },
};

const TYPE_MAP = {
  OUT_OF_STOCK: { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-border)', label: 'Out of Stock' },
  LOW_STOCK: { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', label: 'Low Stock' },
};

export default function ActiveAlerts({ alerts }) {
  return (
    <div className="alerts-page">
      {/* Summary */}
      <div className="alerts-summary-bar">
        <div className="alerts-summary-item">
          <Icon name="bell" size={16} color="var(--danger)" />
          <span className="alerts-summary-count">{alerts?.length || 0}</span>
          <span className="alerts-summary-label">Active Alerts</span>
        </div>
        {(() => {
          const criticals = alerts?.filter(a => a.severity === 'CRITICAL').length || 0;
          const highs = alerts?.filter(a => a.severity === 'HIGH').length || 0;
          return (
            <>
              {criticals > 0 && (
                <div className="alerts-summary-item">
                  <span className="alerts-sev-dot" style={{ background: 'var(--danger)' }} />
                  <span className="alerts-summary-count">{criticals}</span>
                  <span className="alerts-summary-label">Critical</span>
                </div>
              )}
              {highs > 0 && (
                <div className="alerts-summary-item">
                  <span className="alerts-sev-dot" style={{ background: 'var(--orange)' }} />
                  <span className="alerts-summary-count">{highs}</span>
                  <span className="alerts-summary-label">High</span>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Table */}
      <div className="alerts-card">
        {!alerts || alerts.length === 0 ? (
          <div className="alerts-empty">
            <Icon name="checkCircle" size={36} color="var(--success)" />
            <p className="alerts-empty-title">All Clear</p>
            <p className="alerts-empty-desc">No active alerts. All stock levels are healthy.</p>
          </div>
        ) : (
          <div className="alerts-table-wrap">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Alert Type</th>
                  <th>Severity</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Message</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => {
                  const sev = SEVERITY_MAP[a.severity] || {};
                  const typeInfo = TYPE_MAP[a.alert_type] || {};
                  return (
                    <tr key={a.alert_id}>
                      <td className="alerts-product">{productName(a)}</td>
                      <td>
                        <span
                          className="alerts-badge"
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
                          className="alerts-badge"
                          style={{
                            color: sev.color,
                            background: sev.bg,
                            borderColor: sev.border,
                          }}
                        >
                          {a.severity}
                        </span>
                      </td>
                      <td className="alerts-stock">{a.products?.current_stock ?? '—'}</td>
                      <td>{a.products?.minimum_threshold ?? '—'}</td>
                      <td className="alerts-message">{a.message}</td>
                      <td className="alerts-date">{formatDate(a.created_at)}</td>
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

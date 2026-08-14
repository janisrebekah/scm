/* eslint-disable react/prop-types */
import { useState } from 'react';
import { postSale, postConsumption, postReceipt, postAdjustment } from '../api';
import Icon from '../components/Icons';
import './Simulator.css';

export default function Simulator({ products, onRefresh }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleTransaction = async (type) => {
    const qty = parseInt(quantity, 10);

    if (!selectedProduct) {
      setResult({ type: 'error', error: 'Please select a product.' });
      return;
    }
    if (type === 'adjustment') {
      if (isNaN(qty) || qty === 0) {
        setResult({ type: 'error', error: 'Adjustment quantity must be a non-zero number.' });
        return;
      }
      if (!reason.trim()) {
        setResult({ type: 'error', error: 'Adjustment requires a reason.' });
        return;
      }
    } else {
      if (isNaN(qty) || qty <= 0) {
        setResult({ type: 'error', error: 'Quantity must be a positive number.' });
        return;
      }
    }

    setSubmitting(true);
    setResult(null);

    try {
      let res;
      switch (type) {
        case 'sale':
          res = await postSale(selectedProduct, qty, reason);
          break;
        case 'consumption':
          res = await postConsumption(selectedProduct, qty, reason);
          break;
        case 'receipt':
          res = await postReceipt(selectedProduct, qty, reason);
          break;
        case 'adjustment':
          res = await postAdjustment(selectedProduct, qty, reason);
          break;
        default:
          return;
      }
      setResult({ type: 'success', data: res, txType: type });
      if (onRefresh) await onRefresh();
    } catch (err) {
      setResult({ type: 'error', error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProd = products?.find(p => p.product_id === selectedProduct);

  return (
    <div className="simulator-page">
      {/* Transaction Form Card */}
      <div className="sim-card">
        <div className="sim-card-header">
          <div className="sim-card-title">
            <Icon name="zap" size={18} color="var(--primary)" />
            <span>Transaction Entry</span>
          </div>
          <p className="sim-card-desc">
            Simulate real inventory transactions. Select a product, enter a quantity, and perform a transaction to see live updates.
          </p>
        </div>

        <div className="sim-form-grid">
          <div className="sim-field">
            <label htmlFor="sim-product">Product</label>
            <select
              id="sim-product"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              disabled={submitting}
            >
              <option value="">Select product...</option>
              {products?.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} (stock: {p.current_stock})
                </option>
              ))}
            </select>
          </div>

          <div className="sim-field">
            <label htmlFor="sim-qty">Quantity</label>
            <input
              id="sim-qty"
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="sim-field">
            <label htmlFor="sim-reason">Reason <span className="field-hint">(required for adjustment)</span></label>
            <input
              id="sim-reason"
              type="text"
              placeholder="Optional reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="sim-actions">
          <button className="sim-btn sim-btn-sale" onClick={() => handleTransaction('sale')} disabled={submitting}>
            <Icon name="arrowDownRight" size={15} />
            Sale
          </button>
          <button className="sim-btn sim-btn-consumption" onClick={() => handleTransaction('consumption')} disabled={submitting}>
            <Icon name="arrowDownRight" size={15} />
            Consumption
          </button>
          <button className="sim-btn sim-btn-receipt" onClick={() => handleTransaction('receipt')} disabled={submitting}>
            <Icon name="arrowUpRight" size={15} />
            Receipt
          </button>
          <button className="sim-btn sim-btn-adjustment" onClick={() => handleTransaction('adjustment')} disabled={submitting}>
            <Icon name="refreshCw" size={15} />
            Adjustment
          </button>
        </div>

        {submitting && (
          <div className="sim-loading">
            <span className="sim-spinner" />
            Processing transaction...
          </div>
        )}
      </div>

      {/* Result Card */}
      {result && !submitting && (
        <div className={`sim-result-card ${result.type}`}>
          {result.type === 'error' ? (
            <>
              <div className="sim-result-header error">
                <Icon name="xCircle" size={18} />
                <span>Transaction Failed</span>
              </div>
              <p className="sim-result-error">{result.error}</p>
            </>
          ) : (
            <>
              <div className="sim-result-header success">
                <Icon name="checkCircle" size={18} />
                <span>{result.txType?.toUpperCase()} — {selectedProd?.product_name || 'Product'}</span>
              </div>

              {/* Stock Flow */}
              <div className="sim-flow">
                <div className="sim-flow-box">
                  <div className="sim-flow-label">Previous</div>
                  <div className="sim-flow-value">{result.data.previous_stock}</div>
                </div>
                <div className="sim-flow-arrow">
                  <Icon name="arrowUpRight" size={16} color="var(--text-muted)" style={{ transform: 'rotate(90deg)' }} />
                </div>
                <div className="sim-flow-box">
                  <div className="sim-flow-label">Change</div>
                  <div className={`sim-flow-value ${result.data.quantity >= 0 ? 'positive' : 'negative'}`}>
                    {result.data.quantity >= 0 ? '+' : ''}{result.data.quantity}
                  </div>
                </div>
                <div className="sim-flow-arrow">
                  <Icon name="arrowUpRight" size={16} color="var(--text-muted)" style={{ transform: 'rotate(90deg)' }} />
                </div>
                <div className="sim-flow-box highlight">
                  <div className="sim-flow-label">New Stock</div>
                  <div className="sim-flow-value">{result.data.new_stock}</div>
                </div>
              </div>

              {/* Triggered Events */}
              <div className="sim-events">
                {result.data.alert && (
                  <div className="sim-event-row">
                    <span className="sim-event-badge alert-badge">
                      <Icon name="bell" size={12} />
                    </span>
                    <span className="sim-event-text">
                      <strong>{result.data.alert.alert_type?.replace('_', ' ')}</strong>
                      {' '}— {result.data.alert.severity} — {result.data.alert.status}
                    </span>
                  </div>
                )}
                {result.data.reorder_recommendation && (
                  <div className="sim-event-row">
                    <span className="sim-event-badge reorder-badge">
                      <Icon name="refreshCw" size={12} />
                    </span>
                    <span className="sim-event-text">
                      Reorder recommended: <strong>{result.data.reorder_recommendation.recommended_quantity} units</strong>
                      {' '}— {result.data.reorder_recommendation.status}
                    </span>
                  </div>
                )}
                {result.data.notification && (
                  <div className="sim-event-row">
                    <span className={`sim-event-badge ${result.data.notification.status === 'SENT' ? 'notif-badge' : 'notif-fail-badge'}`}>
                      <Icon name={result.data.notification.status === 'SENT' ? 'checkCircle' : 'xCircle'} size={12} />
                    </span>
                    <span className="sim-event-text">
                      {result.data.notification.channel}: <strong>{result.data.notification.status}</strong>
                      {' '}→ {result.data.notification.recipient}
                    </span>
                  </div>
                )}
                {!result.data.alert && !result.data.reorder_recommendation && !result.data.notification && (
                  <div className="sim-event-row">
                    <span className="sim-event-badge neutral-badge">
                      <Icon name="checkCircle" size={12} />
                    </span>
                    <span className="sim-event-text">No alerts or recommendations triggered.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

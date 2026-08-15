/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from 'react';
import { postIncoming, postOutgoing, fetchTransactions } from '../api';
import Icon from '../components/Icons';
import { formatDate } from '../utils';
import './Simulator.css';

export default function Simulator({ products, onRefresh }) {
  /* ── Transaction Form State ─────────────────────────── */
  const [transactionType, setTransactionType] = useState('IN');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  /* ── Transaction History State ──────────────────────── */
  const [transactions, setTransactions] = useState([]);
  const [txFilter, setTxFilter] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  /* ── Load transactions ──────────────────────────────── */
  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const data = await fetchTransactions(txFilter || undefined);
      setTransactions(data);
    } catch {
      // Silently handle — table will show empty
    } finally {
      setTxLoading(false);
    }
  }, [txFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  /* ── Handle transaction submit ──────────────────────── */
  const handleSubmit = async () => {
    const qty = parseInt(quantity, 10);

    if (!selectedProduct) {
      setResult({ type: 'error', error: 'Please select a product.' });
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setResult({ type: 'error', error: 'Quantity must be a positive number.' });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      let res;
      if (transactionType === 'IN') {
        res = await postIncoming(selectedProduct, qty);
      } else {
        res = await postOutgoing(selectedProduct, qty);
      }
      setResult({ type: 'success', data: res, txType: transactionType });
      setQuantity('');
      await loadTransactions();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setResult({ type: 'error', error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Display helpers ────────────────────────────────── */
  const displayType = (type) => {
    if (type === 'IN') return 'Incoming';
    if (type === 'OUT') return 'Outgoing';
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const selectedProd = products?.find(p => p.product_id === selectedProduct);

  /* ── CSV Export ──────────────────────────────────────── */
  const handleExportCSV = () => {
    const headers = ['Date', 'Product', 'Transaction Type', 'Quantity'];
    const rows = transactions.map(tx => [
      tx.created_at
        ? new Date(tx.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '',
      tx.products?.product_name || '',
      displayType(tx.transaction_type),
      tx.quantity,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stockHealth = (prod) => {
    if (!prod) return null;
    if (prod.current_stock === 0) return { label: 'Out of Stock', cls: 'out' };
    if (prod.current_stock <= prod.minimum_threshold) return { label: 'Low Stock', cls: 'low' };
    return { label: 'Healthy', cls: 'ok' };
  };

  const health = stockHealth(selectedProd);

  return (
    <div className="sim-page">
      {/* ════ TWO-PANEL LAYOUT ════ */}
      <div className="sim-layout">

        {/* ──── LEFT: FORM PANEL ──── */}
        <div className="sim-form-panel">
          <div className="sim-panel-card">
            <h3 className="sim-panel-title">Transaction Type</h3>
            <div className="sim-type-grid">
              <button
                className={`sim-type-btn ${transactionType === 'IN' ? 'active in' : ''}`}
                onClick={() => setTransactionType('IN')}
                disabled={submitting}
              >
                <Icon name="plus" size={18} />
                <span>Incoming</span>
              </button>
              <button
                className={`sim-type-btn ${transactionType === 'OUT' ? 'active out' : ''}`}
                onClick={() => setTransactionType('OUT')}
                disabled={submitting}
              >
                <Icon name="truck" size={18} />
                <span>Outgoing</span>
              </button>
            </div>

            <div className="sim-form-fields">
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

              {/* Current Stock Indicator */}
              {selectedProd && (
                <div className="sim-stock-indicator">
                  <div className="sim-stock-row">
                    <span>Current Stock</span>
                    <strong>{selectedProd.current_stock} units</strong>
                  </div>
                  {health && <span className={`sim-health-badge ${health.cls}`}>{health.label}</span>}
                </div>
              )}

              <div className="sim-field">
                <label htmlFor="sim-qty">Quantity</label>
                <input
                  id="sim-qty"
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <button
              className="sim-submit-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><span className="sim-spinner" /> Processing...</>
              ) : (
                <><Icon name="checkCircle" size={15} /> Record Transaction</>
              )}
            </button>
          </div>

          {/* Result Feedback */}
          {result && !submitting && (
            <div className={`sim-result ${result.type}`}>
              {result.type === 'error' ? (
                <div className="sim-result-inner">
                  <Icon name="xCircle" size={16} />
                  <span>{result.error}</span>
                </div>
              ) : (
                <>
                  <div className="sim-result-inner success">
                    <Icon name="checkCircle" size={16} />
                    <span>{displayType(result.txType)} — {selectedProd?.product_name || 'Product'}</span>
                  </div>
                  <div className="sim-flow">
                    <div className="sim-flow-box">
                      <span>Previous</span>
                      <strong>{result.data.previous_stock}</strong>
                    </div>
                    <div className="sim-flow-arrow">→</div>
                    <div className={`sim-flow-box ${result.data.quantity >= 0 ? 'change-in' : 'change-out'}`}>
                      <span>Change</span>
                      <strong>{result.data.quantity >= 0 ? '+' : ''}{result.data.quantity}</strong>
                    </div>
                    <div className="sim-flow-arrow">→</div>
                    <div className="sim-flow-box highlight">
                      <span>New Stock</span>
                      <strong>{result.data.new_stock}</strong>
                    </div>
                  </div>
                  <div className="sim-events">
                    {result.data.alert && (
                      <div className="sim-event"><span className="sim-ev-dot alert" /><span><strong>{result.data.alert.alert_type?.replace('_', ' ')}</strong> — {result.data.alert.severity}</span></div>
                    )}
                    {result.data.reorder_recommendation && (
                      <div className="sim-event"><span className="sim-ev-dot reorder" /><span>Reorder: <strong>{result.data.reorder_recommendation.recommended_quantity} units</strong></span></div>
                    )}
                    {result.data.notification && (
                      <div className="sim-event"><span className={`sim-ev-dot ${result.data.notification.status === 'SENT' ? 'notif' : 'notif-fail'}`} /><span>{result.data.notification.channel}: <strong>{result.data.notification.status}</strong></span></div>
                    )}
                    {!result.data.alert && !result.data.reorder_recommendation && !result.data.notification && (
                      <div className="sim-event"><span className="sim-ev-dot ok" /><span>No alerts or recommendations triggered.</span></div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ──── RIGHT: TRANSACTION LOG ──── */}
        <div className="sim-log-panel">
          <div className="sim-panel-card sim-log-card">
            <div className="sim-log-header">
              <h3 className="sim-panel-title">Transaction Log</h3>
              <span className="sim-log-count">{transactions.length} total</span>
            </div>

            <div className="sim-log-toolbar">
              <div className="sim-filter-tabs">
                <button className={`sim-tab ${txFilter === '' ? 'active' : ''}`} onClick={() => setTxFilter('')}>All Types</button>
                <button className={`sim-tab ${txFilter === 'IN' ? 'active' : ''}`} onClick={() => setTxFilter('IN')}>Incoming</button>
                <button className={`sim-tab ${txFilter === 'OUT' ? 'active' : ''}`} onClick={() => setTxFilter('OUT')}>Outgoing</button>
              </div>
              <button className="sim-export-btn" onClick={handleExportCSV} disabled={transactions.length === 0}>
                <Icon name="download" size={13} /> Export
              </button>
            </div>

            <div className="sim-log-table-wrap">
              {txLoading ? (
                <div className="sim-loading"><span className="sim-spinner" /> Loading...</div>
              ) : transactions.length === 0 ? (
                <div className="sim-log-empty"><Icon name="inbox" size={28} /><p>No transactions found.</p></div>
              ) : (
                <table className="sim-log-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.transaction_id}>
                        <td className="sim-log-date">{formatDate(tx.created_at)}</td>
                        <td className="sim-log-product">{tx.products?.product_name || '—'}</td>
                        <td>
                          <span className={`sim-log-type ${tx.transaction_type === 'IN' ? 'in' : tx.transaction_type === 'OUT' ? 'out' : ''}`}>
                            {displayType(tx.transaction_type)}
                          </span>
                        </td>
                        <td className={`sim-log-qty ${tx.quantity >= 0 ? 'pos' : 'neg'}`}>
                          {tx.quantity >= 0 ? '+' : ''}{tx.quantity}
                        </td>
                        <td className="sim-log-balance">{tx.products?.current_stock ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

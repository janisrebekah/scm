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

  return (
    <div className="simulator-page">
      {/* Transaction Form Card */}
      <div className="sim-card">
        <div className="sim-card-header">
          <div className="sim-card-title">
            <Icon name="zap" size={18} color="var(--primary)" />
            <span>Record Transaction</span>
          </div>
          <p className="sim-card-desc">
            Record incoming or outgoing inventory transactions. Select a product, choose the transaction type, and enter the quantity.
          </p>
        </div>

        <div className="sim-form-grid">
          <div className="sim-field">
            <label htmlFor="sim-type">Transaction Type</label>
            <select
              id="sim-type"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              disabled={submitting}
            >
              <option value="IN">Incoming</option>
              <option value="OUT">Outgoing</option>
            </select>
          </div>

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
              min="1"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="sim-actions">
          <button
            className="sim-btn sim-btn-record"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Icon name="checkCircle" size={15} />
            Record Transaction
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
                <span>{displayType(result.txType)} — {selectedProd?.product_name || 'Product'}</span>
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

      {/* Transaction History Card */}
      <div className="sim-card">
        <div className="sim-card-header">
          <div className="sim-card-title">
            <Icon name="clock" size={18} color="var(--primary)" />
            <span>Transaction History</span>
          </div>
        </div>

        <div className="sim-history-toolbar">
          <div className="sim-filter-tabs">
            <button
              className={`sim-filter-tab ${txFilter === '' ? 'active' : ''}`}
              onClick={() => setTxFilter('')}
            >
              All
            </button>
            <button
              className={`sim-filter-tab ${txFilter === 'IN' ? 'active' : ''}`}
              onClick={() => setTxFilter('IN')}
            >
              Incoming
            </button>
            <button
              className={`sim-filter-tab ${txFilter === 'OUT' ? 'active' : ''}`}
              onClick={() => setTxFilter('OUT')}
            >
              Outgoing
            </button>
          </div>
          <button
            className="sim-export-btn"
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
          >
            <Icon name="download" size={14} />
            Export CSV
          </button>
        </div>

        <div className="sim-table-wrap">
          {txLoading ? (
            <div className="sim-loading" style={{ justifyContent: 'center', padding: '32px' }}>
              <span className="sim-spinner" />
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="sim-empty">
              <Icon name="inbox" size={32} color="var(--text-light)" />
              <p>No transactions found.</p>
            </div>
          ) : (
            <table className="sim-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.transaction_id}>
                    <td>{formatDate(tx.created_at)}</td>
                    <td className="sim-tx-product">{tx.products?.product_name || '—'}</td>
                    <td>
                      <span className={`sim-tx-type-badge ${tx.transaction_type === 'IN' ? 'sim-tx-in' : tx.transaction_type === 'OUT' ? 'sim-tx-out' : ''}`}>
                        {displayType(tx.transaction_type)}
                      </span>
                    </td>
                    <td className={`sim-tx-qty ${tx.quantity >= 0 ? 'positive' : 'negative'}`}>
                      {tx.quantity >= 0 ? '+' : ''}{tx.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

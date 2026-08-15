import { useMemo, useState } from 'react';
import Icon from '../components/Icons';
import {
  formatDate,
  formatDateOnly,
  formatNumber,
  getExpiryStatus,
  productName,
} from '../utils';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './Dashboard.css';

const DAY_MS = 1000 * 60 * 60 * 24;

function daysUntil(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / DAY_MS);
}

function navigateTo(label) {
  const navButton = Array.from(document.querySelectorAll('.nav-item')).find((btn) => (
    btn.querySelector('.nav-label')?.textContent === label
  ));
  navButton?.click();
}

function shortDateLabel(date) {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function buildMovementSeries(transactions, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { key: d.toISOString().slice(0, 10), label: shortDateLabel(d), Incoming: 0, Outgoing: 0 };
  });
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  transactions.forEach((tx) => {
    if (!tx.created_at) return;
    const d = new Date(tx.created_at);
    d.setHours(0, 0, 0, 0);
    if (d < start || d > today) return;
    const b = byKey.get(d.toISOString().slice(0, 10));
    if (!b) return;
    if (tx.transaction_type === 'IN') b.Incoming += Math.abs(tx.quantity || 0);
    if (tx.transaction_type === 'OUT') b.Outgoing += Math.abs(tx.quantity || 0);
  });
  return buckets;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="d-tooltip">
      <p className="d-tooltip-lbl">{label}</p>
      {payload.map((e) => (
        <p key={e.dataKey} style={{ color: e.color }} className="d-tooltip-val">{e.name}: <strong>{formatNumber(e.value)}</strong></p>
      ))}
    </div>
  );
}

/* eslint-disable react/prop-types */
export default function Dashboard({ data }) {
  const [movePeriod, setMovePeriod] = useState(7);

  const {
    inventory_status: inv = {},
    products = [],
    active_alerts: alerts = [],
    reorder_recommendations: reorders = [],
    recent_transactions: transactions = [],
    reorder_summary: reorderSum = {},
  } = data || {};

  /* ─── derived data ─── */
  const expiryProducts = useMemo(() => (
    products
      .map((p) => ({ ...p, expiryStatus: getExpiryStatus(p.expiry_date), daysLeft: daysUntil(p.expiry_date) }))
      .filter((p) => p.expiryStatus === 'near-expiry' || p.expiryStatus === 'expired')
      .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))
  ), [products]);

  const expiredList = expiryProducts.filter((p) => p.expiryStatus === 'expired');
  const nearExpiryList = expiryProducts.filter((p) => p.expiryStatus === 'near-expiry');

  const total = inv.total_products ?? products.length;
  const healthy = inv.healthy_products ?? 0;
  const low = inv.low_stock_products ?? 0;
  const out = inv.out_of_stock_products ?? 0;
  const nearExpCt = nearExpiryList.length;
  const expiredCt = expiredList.length;
  const healthPct = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const totalStock = products.reduce((s, p) => s + (p.current_stock || 0), 0);

  const inOut = transactions.filter((tx) => tx.transaction_type === 'IN' || tx.transaction_type === 'OUT');
  const series = buildMovementSeries(inOut, movePeriod);
  const moveTotals = series.reduce((t, d) => ({ inc: t.inc + d.Incoming, outg: t.outg + d.Outgoing }), { inc: 0, outg: 0 });
  const net = moveTotals.inc - moveTotals.outg;

  const lowStockList = products
    .filter(p => p.current_stock > 0 && p.current_stock <= p.minimum_threshold)
    .sort((a, b) => a.current_stock - b.current_stock);

  const pending = reorders.filter((r) => r.status === 'PENDING').sort((a, b) => (a.current_stock ?? 0) - (b.current_stock ?? 0));

  /* ─── health donut data ─── */
  const donutData = [{ value: healthPct }, { value: 100 - healthPct }];

  return (
    <div className="d-page">

      {/* ════ TOP: STAT CARDS ════ */}
      <section className="d-stats-row">
        <div className="d-stat"><div className="d-stat-ic d-ic-purple"><Icon name="layers" size={20} /></div><div><strong>{formatNumber(total)}</strong><span>Total Products</span></div></div>
        <div className="d-stat"><div className="d-stat-ic d-ic-amber"><Icon name="activity" size={20} /></div><div><strong>{formatNumber(totalStock)}</strong><span>Total Stock</span></div></div>
        <div className="d-stat"><div className="d-stat-ic d-ic-rose"><Icon name="xCircle" size={20} /></div><div><strong>{formatNumber(out)}</strong><span>Out of Stock</span></div></div>
        <div className="d-stat"><div className="d-stat-ic d-ic-mag"><Icon name="bell" size={20} /></div><div><strong>{formatNumber(alerts.length)}</strong><span>Active Alerts</span></div></div>
        <div className="d-stat"><div className="d-stat-ic d-ic-green"><Icon name="refreshCw" size={20} /></div><div><strong>{formatNumber(reorderSum.pending_reorders || pending.length)}</strong><span>Pending Reorders</span></div></div>
      </section>

      {/* ════ MAIN TWO-PANEL LAYOUT ════ */}
      <section className="d-main-layout">

        {/* ──── LEFT: PRIMARY CONTENT ──── */}
        <div className="d-primary">

          {/* INVENTORY HEALTH */}
          <div className="d-card d-health">
            <div className="d-card-top"><h3>Inventory Health Overview</h3></div>
            <div className="d-health-grid">
              <div className="d-donut-area">
                <div className="d-donut-wrap">
                  <ResponsiveContainer width={150} height={150}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={68} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                        <Cell fill="#451952" />
                        <Cell fill="#ede8f2" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="d-donut-label"><strong>{healthPct}%</strong><span>Healthy</span></div>
                </div>
                <p className="d-health-headline">{formatNumber(healthy)} of {formatNumber(total)} products healthy</p>
              </div>
              <div className="d-health-metrics">
                <div className="d-hm"><span>Total</span><strong>{formatNumber(total)}</strong><i className="d-hm-bar d-hm-purple" /></div>
                <div className="d-hm"><span>Low Stock</span><strong className="tc-amber">{formatNumber(low)}</strong><i className="d-hm-bar d-hm-amber" /></div>
                <div className="d-hm"><span>Out of Stock</span><strong className="tc-rose">{formatNumber(out)}</strong><i className="d-hm-bar d-hm-rose" /></div>
                <div className="d-hm"><span>Near Expiry</span><strong className="tc-amber">{formatNumber(nearExpCt)}</strong><i className="d-hm-bar d-hm-amber" /></div>
                <div className="d-hm"><span>Expired</span><strong className="tc-mag">{formatNumber(expiredCt)}</strong><i className="d-hm-bar d-hm-mag" /></div>
              </div>
            </div>
          </div>

          {/* WHAT NEEDS ATTENTION */}
          <div className="d-card d-attention">
            <div className="d-card-top">
              <h3>What Needs My Attention</h3>
              <button className="d-link" onClick={() => navigateTo('Alerts')}>All Alerts <Icon name="arrowUpRight" size={12} /></button>
            </div>
            {lowStockList.length === 0 && pending.length === 0 ? (
              <div className="d-empty"><Icon name="checkCircle" size={22} /><div><strong>All clear</strong><p>No low-stock or reorder issues.</p></div></div>
            ) : (
              <div className="d-att-list">
                {lowStockList.slice(0, 5).map((p) => {
                  const pct = Math.min((p.current_stock / Math.max(p.minimum_threshold, 1)) * 100, 100);
                  const reorder = pending.find(r => r.product_id === p.product_id);
                  return (
                    <div className="d-att-item" key={p.product_id}>
                      <div className="d-att-sev" />
                      <div className="d-att-body">
                        <div className="d-att-top-line">
                          <strong>{p.product_name}</strong>
                          <span className="d-att-stock">{formatNumber(p.current_stock)} / {formatNumber(p.minimum_threshold)}</span>
                        </div>
                        <div className="d-att-bar"><span style={{ width: `${pct}%` }} /></div>
                        {reorder && (
                          <div className="d-att-reorder">
                            <Icon name="refreshCw" size={12} />
                            Recommended reorder: <strong>+{formatNumber(reorder.recommended_quantity)} units</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* INVENTORY MOVEMENT */}
          <div className="d-card d-movement">
            <div className="d-card-top">
              <h3>Inventory Movement</h3>
              <div className="d-period">
                <button className={movePeriod === 7 ? 'active' : ''} onClick={() => setMovePeriod(7)}>7D</button>
                <button className={movePeriod === 30 ? 'active' : ''} onClick={() => setMovePeriod(30)}>30D</button>
              </div>
            </div>
            <div className="d-move-body">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#451952" stopOpacity={0.22} /><stop offset="100%" stopColor="#451952" stopOpacity={0.02} /></linearGradient>
                    <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F39F5A" stopOpacity={0.2} /><stop offset="100%" stopColor="#F39F5A" stopOpacity={0.02} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(69,25,82,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="Incoming" stroke="#451952" strokeWidth={2.5} fill="url(#gIn)" />
                  <Area type="monotone" dataKey="Outgoing" stroke="#F39F5A" strokeWidth={2.5} fill="url(#gOut)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="d-move-legend">
                <div><i style={{ background: '#451952' }} /><span>Incoming</span><strong className="tc-purple">+{formatNumber(moveTotals.inc)}</strong></div>
                <div><i style={{ background: '#F39F5A' }} /><span>Outgoing</span><strong className="tc-amber">-{formatNumber(moveTotals.outg)}</strong></div>
                <div><i style={{ background: net >= 0 ? '#22c55e' : '#AC445A' }} /><span>Net</span><strong className={net >= 0 ? 'tc-green' : 'tc-rose'}>{net >= 0 ? '+' : ''}{formatNumber(net)}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* ──── RIGHT: SECONDARY SIDEBAR ──── */}
        <div className="d-secondary">

          {/* EXPIRY RISK */}
          <div className="d-card d-expiry">
            <div className="d-card-top">
              <h3>Expiry Risk</h3>
              <button className="d-link" onClick={() => navigateTo('Inventory Overview')}>View All <Icon name="arrowUpRight" size={12} /></button>
            </div>
            {expiryProducts.length === 0 ? (
              <div className="d-empty sm"><Icon name="checkCircle" size={18} /><div><strong>No risks</strong></div></div>
            ) : (
              <div className="d-exp-list">
                {expiredList.slice(0, 2).map((p) => (
                  <div className="d-exp-row expired" key={p.product_id}>
                    <div className="d-exp-info"><strong>{p.product_name}</strong><span>{formatDateOnly(p.expiry_date)}</span></div>
                    <span className="d-exp-tag expired">Expired</span>
                  </div>
                ))}
                {nearExpiryList.slice(0, 4).map((p) => (
                  <div className="d-exp-row near" key={p.product_id}>
                    <div className="d-exp-info"><strong>{p.product_name}</strong><span>{formatDateOnly(p.expiry_date)}</span></div>
                    <span className="d-exp-tag near">{p.daysLeft}d left</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REORDER SUMMARY */}
          <div className="d-card d-reorder">
            <div className="d-card-top">
              <h3>Reorder Summary</h3>
              <button className="d-link" onClick={() => navigateTo('Reorder Management')}>Manage <Icon name="arrowUpRight" size={12} /></button>
            </div>
            <div className="d-ro-grid">
              <div className="d-ro-s"><strong className="tc-amber">{formatNumber(reorderSum.pending_reorders || pending.length)}</strong><span>Pending</span></div>
              <div className="d-ro-s"><strong className="tc-purple">{formatNumber(reorderSum.ordered_reorders || 0)}</strong><span>Ordered</span></div>
              <div className="d-ro-s"><strong className="tc-green">{formatNumber(reorderSum.completed_reorders || 0)}</strong><span>Completed</span></div>
              <div className="d-ro-s"><strong>{formatNumber(reorderSum.total_recommended_units || 0)}</strong><span>Total Units</span></div>
            </div>
            {pending.length > 0 && (
              <div className="d-ro-items">
                {pending.slice(0, 3).map((r) => (
                  <div className="d-ro-row" key={r.recommendation_id}>
                    <span className="d-ro-name">{productName(r)}</span>
                    <span className="d-ro-badge">+{formatNumber(r.recommended_quantity)}</span>
                    <span className="d-ro-status">PENDING</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECENT ACTIVITY */}
          <div className="d-card d-activity">
            <div className="d-card-top">
              <h3>Recent Activity</h3>
              <button className="d-link" onClick={() => navigateTo('Inventory Simulator')}>View All <Icon name="arrowUpRight" size={12} /></button>
            </div>
            {inOut.length === 0 ? (
              <div className="d-empty sm"><Icon name="inbox" size={18} /><div><strong>No activity</strong></div></div>
            ) : (
              <div className="d-act-list">
                {inOut.slice(0, 6).map((tx) => {
                  const isIn = tx.transaction_type === 'IN';
                  return (
                    <div className="d-act-row" key={tx.transaction_id}>
                      <strong className={isIn ? 'tc-purple' : 'tc-rose'}>{isIn ? '+' : '-'}{formatNumber(Math.abs(tx.quantity || 0))}</strong>
                      <div className="d-act-info"><span className="d-act-name">{productName(tx)}</span><span className="d-act-date">{formatDate(tx.created_at)}</span></div>
                      <span className={`d-act-type ${isIn ? 'in' : 'out'}`}>{isIn ? 'IN' : 'OUT'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      
    </div>
  );
}

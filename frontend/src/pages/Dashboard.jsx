/* eslint-disable react/prop-types */
import Icon from '../components/Icons';
import { formatNumber, formatCurrency } from '../utils';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import './Dashboard.css';

const STATUS_COLORS = {
  healthy: '#22c55e',
  low: '#f59e0b',
  out: '#ef4444',
};

const TX_COLORS = {
  SALE: '#ef4444',
  CONSUMPTION: '#f97316',
  RECEIPT: '#22c55e',
  ADJUSTMENT: '#6366f1',
};

export default function Dashboard({ data }) {
  if (!data) return null;

  const {
    inventory_status: inv,
    products,
    active_alerts: alerts,
    reorder_recommendations: reorders,
    reorder_summary: reorderSum,
    recent_transactions: transactions,
    alert_history: history,
  } = data;

  /* ── Derived data ──────────────────────────────────── */

  // Inventory value
  const inventoryValue = products.reduce(
    (sum, p) => sum + (p.current_stock || 0) * (p.unit_price || 0), 0
  );

  // Status distribution for pie chart
  const statusData = [
    { name: 'Healthy', value: inv.healthy_products, color: STATUS_COLORS.healthy },
    { name: 'Low Stock', value: inv.low_stock_products, color: STATUS_COLORS.low },
    { name: 'Out of Stock', value: inv.out_of_stock_products, color: STATUS_COLORS.out },
  ].filter(d => d.value > 0);

  // Top products stock vs threshold (sorted by lowest stock ratio)
  const stockChartData = [...products]
    .sort((a, b) => {
      const ratioA = a.minimum_threshold > 0 ? a.current_stock / a.minimum_threshold : 999;
      const ratioB = b.minimum_threshold > 0 ? b.current_stock / b.minimum_threshold : 999;
      return ratioA - ratioB;
    })
    .slice(0, 8)
    .map(p => ({
      name: p.product_name.length > 14 ? p.product_name.slice(0, 14) + '…' : p.product_name,
      stock: p.current_stock,
      threshold: p.minimum_threshold,
    }));

  // Transaction type counts
  const txCounts = {};
  transactions.forEach(t => {
    txCounts[t.transaction_type] = (txCounts[t.transaction_type] || 0) + 1;
  });
  const txData = Object.entries(txCounts).map(([name, count]) => ({
    name: name.charAt(0) + name.slice(1).toLowerCase(),
    count,
    fill: TX_COLORS[name] || '#6366f1',
  }));

  // Alert severity counts
  const severityCounts = {};
  alerts.forEach(a => {
    severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1;
  });

  // Category distribution
  const categoryCounts = {};
  products.forEach(p => {
    const cat = p.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  /* ── KPI definitions ───────────────────────────────── */
  const kpis = [
    {
      label: 'Total Products',
      value: formatNumber(inv.total_products),
      icon: 'package',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.10)',
    },
    {
      label: 'Total Stock Units',
      value: formatNumber(inv.total_stock_units),
      icon: 'layers',
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.10)',
    },
    {
      label: 'Inventory Value',
      value: formatCurrency(inventoryValue),
      icon: 'dollarSign',
      color: '#7c5cfc',
      bg: 'rgba(124, 92, 252, 0.10)',
    },
    {
      label: 'Low Stock Items',
      value: formatNumber(inv.low_stock_products),
      icon: 'alertTriangle',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.10)',
    },
    {
      label: 'Out of Stock',
      value: formatNumber(inv.out_of_stock_products),
      icon: 'minusCircle',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.10)',
    },
    {
      label: 'Active Alerts',
      value: formatNumber(alerts.length),
      icon: 'bell',
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.10)',
    },
  ];

  /* ── Custom tooltip ────────────────────────────────── */
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="chart-tooltip-value" style={{ color: entry.color || entry.fill }}>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-icon" style={{ background: kpi.bg }}>
              <Icon name={kpi.icon} size={20} color={kpi.color} />
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="chart-row">
        {/* Inventory Status Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-title">
              <Icon name="pieChart" size={16} color="var(--primary)" />
              Inventory Status
            </h3>
          </div>
          <div className="chart-body pie-chart-body">
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="chart-tooltip">
                            <p className="chart-tooltip-value" style={{ color: payload[0].payload.color }}>
                              {payload[0].name}: <strong>{payload[0].value}</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {statusData.map((d, i) => (
                    <div className="pie-legend-item" key={i}>
                      <span className="pie-legend-dot" style={{ background: d.color }} />
                      <span className="pie-legend-label">{d.name}</span>
                      <span className="pie-legend-value">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="chart-empty">No product data available</div>
            )}
          </div>
        </div>

        {/* Stock Levels */}
        <div className="chart-card chart-card-wide">
          <div className="chart-card-header">
            <h3 className="chart-title">
              <Icon name="barChart" size={16} color="var(--primary)" />
              Stock Levels vs Threshold
            </h3>
            <span className="chart-subtitle">Top 8 products by urgency</span>
          </div>
          <div className="chart-body">
            {stockChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stockChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#eef0f6' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                  <Bar dataKey="stock" name="Current Stock" fill="#7c5cfc" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="threshold" name="Min Threshold" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No stock data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="chart-row">
        {/* Transaction Activity */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-title">
              <Icon name="activity" size={16} color="var(--primary)" />
              Recent Transactions
            </h3>
            <span className="chart-subtitle">Last 20 transactions by type</span>
          </div>
          <div className="chart-body">
            {txData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={txData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#eef0f6' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]} barSize={36}>
                    {txData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No recent transactions</div>
            )}
          </div>
        </div>

        {/* Reorder & Alert Summary */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-title">
              <Icon name="target" size={16} color="var(--primary)" />
              Operations Summary
            </h3>
          </div>
          <div className="chart-body summary-body">
            {/* Reorder Summary */}
            <div className="summary-section">
              <div className="summary-section-title">Reorder Status</div>
              <div className="summary-row-grid">
                <div className="summary-mini-card">
                  <span className="summary-mini-value" style={{ color: 'var(--warning)' }}>{reorderSum.pending_reorders}</span>
                  <span className="summary-mini-label">Pending</span>
                </div>
                <div className="summary-mini-card">
                  <span className="summary-mini-value" style={{ color: 'var(--primary)' }}>{reorderSum.ordered_reorders}</span>
                  <span className="summary-mini-label">Ordered</span>
                </div>
                <div className="summary-mini-card">
                  <span className="summary-mini-value" style={{ color: 'var(--success)' }}>{reorderSum.completed_reorders}</span>
                  <span className="summary-mini-label">Completed</span>
                </div>
                <div className="summary-mini-card">
                  <span className="summary-mini-value" style={{ color: 'var(--text-primary)' }}>{formatNumber(reorderSum.total_recommended_units)}</span>
                  <span className="summary-mini-label">Rec. Units</span>
                </div>
              </div>
            </div>

            {/* Alert Severity Summary */}
            <div className="summary-section">
              <div className="summary-section-title">Alert Severity</div>
              {Object.keys(severityCounts).length > 0 ? (
                <div className="severity-bars">
                  {Object.entries(severityCounts).map(([severity, count]) => (
                    <div className="severity-bar-row" key={severity}>
                      <span className="severity-bar-label">{severity}</span>
                      <div className="severity-bar-track">
                        <div
                          className="severity-bar-fill"
                          style={{
                            width: `${Math.min((count / Math.max(alerts.length, 1)) * 100, 100)}%`,
                            background: severity === 'CRITICAL' ? '#ef4444' : severity === 'HIGH' ? '#f97316' : '#f59e0b',
                          }}
                        />
                      </div>
                      <span className="severity-bar-count">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="summary-empty">No active alerts</div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="summary-section">
              <div className="summary-section-title">Products by Category</div>
              <div className="category-list">
                {Object.entries(categoryCounts).map(([cat, count]) => (
                  <div className="category-row" key={cat}>
                    <span className="category-name">{cat}</span>
                    <span className="category-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

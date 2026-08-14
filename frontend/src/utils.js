/**
 * Shared utility helpers used across all pages.
 */

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num) {
  if (num == null) return '—';
  return num.toLocaleString('en-IN');
}

export function formatCurrency(num) {
  if (num == null) return '—';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function getStockStatus(currentStock, threshold) {
  if (currentStock === 0) return 'out-of-stock';
  if (currentStock <= threshold) return 'low-stock';
  return 'healthy';
}

export function getStockStatusLabel(currentStock, threshold) {
  if (currentStock === 0) return 'Out of Stock';
  if (currentStock <= threshold) return 'Low Stock';
  return 'Healthy';
}

export function productName(row) {
  return row?.products?.product_name || '—';
}

/* ── Expiry helpers ──────────────────────────────────────── */

/** Near-expiry threshold in days (centralized, easily changeable) */
export const NEAR_EXPIRY_DAYS = 30;

export function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= NEAR_EXPIRY_DAYS) return 'near-expiry';
  return 'safe';
}

export function getExpiryStatusLabel(expiryDate) {
  const status = getExpiryStatus(expiryDate);
  if (status === 'expired') return 'Expired';
  if (status === 'near-expiry') return 'Near Expiry';
  if (status === 'safe') return 'Safe';
  return '—';
}

export function formatDateOnly(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

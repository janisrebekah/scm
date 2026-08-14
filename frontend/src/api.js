const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchDashboardSummary() {
  const response = await fetch(`${API_BASE}/api/dashboard/summary`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function updateReorderStatus(recommendationId, status) {
  const response = await fetch(`${API_BASE}/api/reorder/${recommendationId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/* ── Transaction APIs ──────────────────────────────────── */

async function postTransaction(endpoint, body) {
  const response = await fetch(`${API_BASE}/api/transactions/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Transaction failed: ${response.status}`);
  }

  return response.json();
}

export function postSale(productId, quantity, reason) {
  return postTransaction('sale', { product_id: productId, quantity, reason: reason || undefined });
}

export function postConsumption(productId, quantity, reason) {
  return postTransaction('consumption', { product_id: productId, quantity, reason: reason || undefined });
}

export function postReceipt(productId, quantity, reason) {
  return postTransaction('receipt', { product_id: productId, quantity, reason: reason || undefined });
}

export function postAdjustment(productId, quantity, reason) {
  return postTransaction('adjustment', { product_id: productId, quantity, reason });
}

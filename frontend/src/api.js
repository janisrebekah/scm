export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
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

export async function completeReorder(recommendationId) {
  const response = await fetch(`${API_BASE}/api/reorder/${recommendationId}/complete`, {
    method: 'POST',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to complete reorder: ${response.status}`);
  }
  return response.json();
}

export async function updateReorderQuantity(recommendationId, quantity) {
  const response = await fetch(`${API_BASE}/api/reorder/${recommendationId}/quantity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommended_quantity: quantity }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update quantity: ${response.status}`);
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

/* ── IN / OUT Transaction APIs ────────────────────────────── */

export function postIncoming(productId, quantity) {
  return postTransaction('in', { product_id: productId, quantity });
}

export function postOutgoing(productId, quantity) {
  return postTransaction('out', { product_id: productId, quantity });
}

export async function fetchTransactions(type) {
  const url = type
    ? `${API_BASE}/api/transactions?type=${type}`
    : `${API_BASE}/api/transactions`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/* ── Product CRUD APIs ────────────────────────────────────── */

export async function createProduct(productData) {
  const response = await fetch(`${API_BASE}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create product: ${response.status}`);
  }
  return response.json();
}

export async function updateProduct(productId, productData) {
  const response = await fetch(`${API_BASE}/api/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update product: ${response.status}`);
  }
  return response.json();
}

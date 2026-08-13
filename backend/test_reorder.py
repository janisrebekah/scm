"""
Reorder Engine Integration Test
Tests the full flow: Transaction -> Stock Update -> Alert -> Reorder Recommendation
"""
import json
import urllib.request

API = "http://localhost:8000"
PRODUCT_ID = "18b536f0-53b3-4fd8-99e3-933f92f9a0e5"  # Toothpaste


def api_call(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        headers={"Content-Type": "application/json"} if data else {},
        method=method,
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def get_product():
    return api_call("GET", f"/api/products/{PRODUCT_ID}")


def sale(qty):
    return api_call("POST", "/api/transactions/sale", {
        "product_id": PRODUCT_ID,
        "quantity": qty,
    })


def receipt(qty):
    return api_call("POST", "/api/transactions/receipt", {
        "product_id": PRODUCT_ID,
        "quantity": qty,
    })


def get_recommendations():
    return api_call("GET", "/api/reorder")


def get_pending():
    return api_call("GET", "/api/reorder/pending")


def get_active_alerts():
    return api_call("GET", "/api/alerts/active")


# --- Step 0: Check current state ---
print("=" * 60)
product = get_product()
print(f"INITIAL STATE: {product['product_name']}")
print(f"  Stock: {product['current_stock']}")
print(f"  Threshold: {product['minimum_threshold']}")
print(f"  Safety Stock: {product['safety_stock']}")
print()

# First, restore stock to 50 for a clean test
current = product["current_stock"]
if current < 50:
    print(f"Restoring stock to 50 (RECEIPT {50 - current})...")
    receipt(50 - current)
    product = get_product()
    print(f"  Stock after restore: {product['current_stock']}")
    print()

# --- Step 1: SALE 30 -> stock 50->20 (at threshold) ---
print("=" * 60)
print("TEST 1: SALE 30 (50 -> 20, AT threshold)")
result = sale(30)
print(f"  Previous Stock: {result.get('previous_stock')}")
print(f"  New Stock:      {result.get('new_stock')}")
print(f"  Alert:          {result.get('alert') is not None}")
if result.get("alert"):
    print(f"    Type:     {result['alert']['alert_type']}")
    print(f"    Severity: {result['alert']['severity']}")
    print(f"    Status:   {result['alert']['status']}")
print(f"  Reorder Rec:    {result.get('reorder_recommendation') is not None}")
if result.get("reorder_recommendation"):
    rec = result["reorder_recommendation"]
    print(f"    Rec Qty:  {rec['recommended_quantity']}")
    print(f"    Status:   {rec['status']}")
    rec_id = rec.get("recommendation_id")
else:
    rec_id = None
print()

# --- Step 2: SALE 1 -> stock 20->19 (below threshold, existing alert) ---
print("=" * 60)
print("TEST 2: SALE 1 (20 -> 19, BELOW threshold, existing alert)")
result = sale(1)
print(f"  Previous Stock: {result.get('previous_stock')}")
print(f"  New Stock:      {result.get('new_stock')}")
print(f"  Alert:          {result.get('alert') is not None}")
if result.get("alert"):
    print(f"    Type:     {result['alert']['alert_type']}")
    print(f"    Status:   {result['alert']['status']}")
print(f"  Reorder Rec:    {result.get('reorder_recommendation') is not None}")
if result.get("reorder_recommendation"):
    rec = result["reorder_recommendation"]
    print(f"    Rec Qty:  {rec['recommended_quantity']}")
    print(f"    Status:   {rec['status']}")
    rec_id = rec.get("recommendation_id")
else:
    rec_id = None
print()

# --- Step 3: Another SALE to confirm PENDING rec is UPDATED not duplicated ---
print("=" * 60)
print("TEST 3: SALE 2 (19 -> 17, should UPDATE existing PENDING rec)")
result = sale(2)
print(f"  Previous Stock: {result.get('previous_stock')}")
print(f"  New Stock:      {result.get('new_stock')}")
print(f"  Reorder Rec:    {result.get('reorder_recommendation') is not None}")
if result.get("reorder_recommendation"):
    rec2 = result["reorder_recommendation"]
    print(f"    Rec ID:   {rec2['recommendation_id']}")
    print(f"    Rec Qty:  {rec2['recommended_quantity']}")
    same_id = rec_id and rec2["recommendation_id"] == rec_id
    print(f"    Same rec as before? {same_id} (no duplicate)")
print()

# Check how many PENDING recommendations exist
pending = get_pending()
toothpaste_pending = [r for r in pending if r["product_id"] == PRODUCT_ID]
print(f"  Total PENDING recs for Toothpaste: {len(toothpaste_pending)}")
print(f"  (Should be exactly 1 -- no duplicates)")
print()

# --- Step 4: RECEIPT to recover stock ---
print("=" * 60)
print("TEST 4: RECEIPT 50 (17 -> 67, stock recovery)")
result = receipt(50)
print(f"  Previous Stock: {result.get('previous_stock')}")
print(f"  New Stock:      {result.get('new_stock')}")
print(f"  Alert:          {result.get('alert')}")
print(f"  Reorder Rec:    {result.get('reorder_recommendation')}")
print()

# Verify alert is resolved
active = get_active_alerts()
tp_active = [a for a in active if a["product_id"] == PRODUCT_ID]
print(f"  Active alerts for Toothpaste: {len(tp_active)}")
print(f"  (Should be 0 -- alert resolved)")
print()

# --- Summary ---
print("=" * 60)
print("ALL TESTS COMPLETE")
product = get_product()
print(f"  Final stock: {product['current_stock']}")

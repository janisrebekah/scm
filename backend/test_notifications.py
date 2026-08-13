"""
Notification Service Integration Test
Tests: LOW_STOCK notification, duplicate prevention, OUT_OF_STOCK,
       notification records in Supabase, and flow integrity.
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
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP ERROR {e.code}: {e.read().decode()}")
        return None


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


def get_dashboard():
    return api_call("GET", "/api/dashboard/summary")


# --- Step 0: Restore stock to 50 ---
print("=" * 60)
product = get_product()
print(f"INITIAL: {product['product_name']} stock={product['current_stock']} threshold={product['minimum_threshold']}")
current = product["current_stock"]
if current != 50:
    if current < 50:
        receipt(50 - current)
    else:
        sale(current - 50)
    product = get_product()
    print(f"  Restored to stock={product['current_stock']}")
print()

# --- Test 1: LOW_STOCK triggers notification ---
print("=" * 60)
print("TEST 1: SALE 35 (50 -> 15) should trigger LOW_STOCK + notification")
result = sale(35)
print(f"  Stock: {result['previous_stock']} -> {result['new_stock']}")
print(f"  Alert: {result.get('alert') is not None}")
if result.get("alert"):
    print(f"    Type: {result['alert']['alert_type']}")
print(f"  Reorder: {result.get('reorder_recommendation') is not None}")
print(f"  Notification: {result.get('notification') is not None}")
if result.get("notification"):
    notif = result["notification"]
    print(f"    Channel:   {notif['channel']}")
    print(f"    Status:    {notif['status']}")
    print(f"    Recipient: {notif['recipient']}")
    print(f"    Message:   {notif['message'][:80]}...")
    first_notif_id = notif.get("notification_id")
else:
    first_notif_id = None
print()

# --- Test 2: Duplicate prevention ---
print("=" * 60)
print("TEST 2: SALE 1 (15 -> 14) existing alert -- should NOT create duplicate notification")
result = sale(1)
print(f"  Stock: {result['previous_stock']} -> {result['new_stock']}")
print(f"  Alert: {result.get('alert') is not None} (existing, reused)")
print(f"  Notification: {result.get('notification')}")
if result.get("notification") is None:
    print("    PASS: No duplicate notification created")
else:
    print("    FAIL: Duplicate notification was created!")
print()

# --- Test 3: Recover stock, then trigger OUT_OF_STOCK ---
print("=" * 60)
print("TEST 3a: RECEIPT to recover (14 -> 64)")
result = receipt(50)
print(f"  Stock: {result['previous_stock']} -> {result['new_stock']}")
print(f"  Alert resolved: {result.get('alert') is None}")
print()

print("TEST 3b: SALE 64 (64 -> 0) should trigger OUT_OF_STOCK + notification")
result = sale(64)
print(f"  Stock: {result['previous_stock']} -> {result['new_stock']}")
print(f"  Alert: {result.get('alert') is not None}")
if result.get("alert"):
    print(f"    Type: {result['alert']['alert_type']}")
    print(f"    Severity: {result['alert']['severity']}")
print(f"  Notification: {result.get('notification') is not None}")
if result.get("notification"):
    notif = result["notification"]
    print(f"    Channel:   {notif['channel']}")
    print(f"    Status:    {notif['status']}")
    print(f"    Message:   {notif['message'][:80]}...")
print()

# --- Test 4: Verify notifications in dashboard ---
print("=" * 60)
print("TEST 4: Check notifications in dashboard summary")
dashboard = get_dashboard()
notifications = dashboard.get("recent_notifications", [])
print(f"  Total recent notifications: {len(notifications)}")
for n in notifications[:5]:
    print(f"    [{n['status']}] {n['channel']} -> {n['recipient']} | {n['message'][:60]}...")
print()

# --- Test 5: Verify existing flow still works ---
print("=" * 60)
print("TEST 5: RECEIPT 50 (0 -> 50) flow integrity check")
result = receipt(50)
print(f"  Stock: {result['previous_stock']} -> {result['new_stock']}")
print(f"  Alert: {result.get('alert')} (should be None - resolved)")
print(f"  Notification: {result.get('notification')} (should be None)")
product = get_product()
print(f"  Final stock: {product['current_stock']}")
print()

print("=" * 60)
print("ALL NOTIFICATION TESTS COMPLETE")

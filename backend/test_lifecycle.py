"""
FULL BACKEND LIFECYCLE VALIDATION
Tests the complete end-to-end flow for a single product (Toothpaste).
"""
import json
import urllib.request
import sys

API = "http://localhost:8000"
PRODUCT_ID = "18b536f0-53b3-4fd8-99e3-933f92f9a0e5"  # Toothpaste

PASS = 0
FAIL = 0


def check(label, condition):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"    PASS: {label}")
    else:
        FAIL += 1
        print(f"    FAIL: {label}")


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
        "product_id": PRODUCT_ID, "quantity": qty})


def receipt(qty):
    return api_call("POST", "/api/transactions/receipt", {
        "product_id": PRODUCT_ID, "quantity": qty})


def get_active_alerts():
    return api_call("GET", "/api/alerts/active")


def get_all_alerts():
    return api_call("GET", "/api/alerts")


def get_pending_reorders():
    return api_call("GET", "/api/reorder/pending")


def get_dashboard():
    return api_call("GET", "/api/dashboard/summary")


def tp_active_alerts():
    return [a for a in get_active_alerts() if a["product_id"] == PRODUCT_ID]


def tp_pending_reorders():
    return [r for r in get_pending_reorders() if r["product_id"] == PRODUCT_ID]


# ==============================================================
# SETUP: Restore Toothpaste to stock=60 (healthy)
# ==============================================================
print("=" * 60)
print("SETUP: Restoring Toothpaste to stock=60")
p = get_product()
current = p["current_stock"]
if current < 60:
    receipt(60 - current)
elif current > 60:
    sale(current - 60)
p = get_product()
print(f"  Stock: {p['current_stock']}  Threshold: {p['minimum_threshold']}")
check("Stock is 60", p["current_stock"] == 60)
print()

# ==============================================================
# STEP 1: Verify product is HEALTHY
# ==============================================================
print("=" * 60)
print("STEP 1: Product should be HEALTHY")
active = tp_active_alerts()
check("No active alerts for Toothpaste", len(active) == 0)
check("Stock (60) > threshold (20)", p["current_stock"] > p["minimum_threshold"])
print()

# ==============================================================
# STEP 2: SALE causes LOW_STOCK
# ==============================================================
print("=" * 60)
print("STEP 2: SALE 45 (60 -> 15) triggers LOW_STOCK")
r = sale(45)
check("Previous stock is 60", r["previous_stock"] == 60)
check("New stock is 15", r["new_stock"] == 15)
print()

# ==============================================================
# STEP 3: Alert is created
# ==============================================================
print("=" * 60)
print("STEP 3: Alert created")
check("Alert exists in response", r.get("alert") is not None)
check("Alert type is LOW_STOCK", r["alert"]["alert_type"] == "LOW_STOCK")
check("Alert severity is HIGH", r["alert"]["severity"] == "HIGH")
check("Alert status is ACTIVE", r["alert"]["status"] == "ACTIVE")
alert_id_1 = r["alert"]["alert_id"]
print(f"  Alert ID: {alert_id_1}")
print()

# ==============================================================
# STEP 4: Reorder recommendation is created
# ==============================================================
print("=" * 60)
print("STEP 4: Reorder recommendation created")
check("Reorder recommendation exists", r.get("reorder_recommendation") is not None)
rec = r["reorder_recommendation"]
check("Reorder status is PENDING", rec["status"] == "PENDING")
check("Recommended quantity > 0", rec["recommended_quantity"] > 0)
rec_id_1 = rec["recommendation_id"]
print(f"  Recommendation ID: {rec_id_1}")
print(f"  Recommended quantity: {rec['recommended_quantity']}")
print()

# ==============================================================
# STEP 5: Mock SMS notification is sent
# ==============================================================
print("=" * 60)
print("STEP 5: Mock SMS notification sent")
check("Notification exists in response", r.get("notification") is not None)
notif = r["notification"]
check("Channel is SMS", notif["channel"] == "SMS")
check("Status is SENT or FAILED", notif["status"] in ("SENT", "FAILED"))
notif_id_1 = notif["notification_id"]
print(f"  Notification ID: {notif_id_1}")
print(f"  Status: {notif['status']}")
print(f"  Message preview: {notif['message'][:70]}...")
print()

# ==============================================================
# STEP 6: Another SALE while alert is ACTIVE
# ==============================================================
print("=" * 60)
print("STEP 6: SALE 3 (15 -> 12) while alert is ACTIVE")
r2 = sale(3)
check("Stock went from 15 to 12", r2["previous_stock"] == 15 and r2["new_stock"] == 12)

# 6a: No duplicate alert
check("Alert still returned (existing)", r2.get("alert") is not None)
check("Same alert ID (no duplicate)", r2["alert"]["alert_id"] == alert_id_1)
active = tp_active_alerts()
check("Exactly 1 active alert for Toothpaste", len(active) == 1)

# 6b: No duplicate notification
check("No duplicate notification", r2.get("notification") is None)

# 6c: Reorder recommendation updated
check("Reorder recommendation returned", r2.get("reorder_recommendation") is not None)
rec2 = r2["reorder_recommendation"]
check("Same recommendation ID (updated, not duplicated)", rec2["recommendation_id"] == rec_id_1)
pending = tp_pending_reorders()
check("Exactly 1 PENDING reorder for Toothpaste", len(pending) == 1)
print()

# ==============================================================
# STEP 7: RECEIPT restores stock above threshold
# ==============================================================
print("=" * 60)
print("STEP 7: RECEIPT 50 (12 -> 62) stock recovery")
r3 = receipt(50)
check("Stock went from 12 to 62", r3["previous_stock"] == 12 and r3["new_stock"] == 62)
check("Alert is None (resolved)", r3.get("alert") is None)
check("No notification on recovery", r3.get("notification") is None)
active = tp_active_alerts()
check("No active alerts for Toothpaste", len(active) == 0)

# Verify alert was actually RESOLVED in DB
all_alerts = get_all_alerts()
resolved = [a for a in all_alerts
            if a["product_id"] == PRODUCT_ID
            and a["alert_id"] == alert_id_1]
if resolved:
    check("First alert status is RESOLVED", resolved[0]["status"] == "RESOLVED")
    check("First alert has resolved_at", resolved[0].get("resolved_at") is not None)
else:
    check("First alert found in history", False)
print()

# ==============================================================
# STEP 8: Another SALE brings stock below threshold AGAIN
# ==============================================================
print("=" * 60)
print("STEP 8: SALE 50 (62 -> 12) triggers NEW LOW_STOCK cycle")
r4 = sale(50)
check("Stock went from 62 to 12", r4["previous_stock"] == 62 and r4["new_stock"] == 12)

# 8a: NEW alert (not the old one)
check("Alert exists", r4.get("alert") is not None)
alert_id_2 = r4["alert"]["alert_id"]
check("NEW alert ID (different from first)", alert_id_2 != alert_id_1)
check("New alert type is LOW_STOCK", r4["alert"]["alert_type"] == "LOW_STOCK")
check("New alert status is ACTIVE", r4["alert"]["status"] == "ACTIVE")
active = tp_active_alerts()
check("Exactly 1 active alert (the new one)", len(active) == 1)
check("Active alert is the new one", active[0]["alert_id"] == alert_id_2)

# 8b: NEW notification allowed
check("New notification exists", r4.get("notification") is not None)
if r4.get("notification"):
    notif_id_2 = r4["notification"]["notification_id"]
    check("New notification ID (different from first)", notif_id_2 != notif_id_1)
    check("New notification channel is SMS", r4["notification"]["channel"] == "SMS")

# 8c: Reorder recommendation generated
check("Reorder recommendation exists", r4.get("reorder_recommendation") is not None)
print()

# ==============================================================
# STEP 9: Dashboard summary validation
# ==============================================================
print("=" * 60)
print("STEP 9: Dashboard summary validation")
dash = get_dashboard()
check("Dashboard returns inventory_status", "inventory_status" in dash)
check("Dashboard returns products", "products" in dash)
check("Dashboard returns active_alerts", "active_alerts" in dash)
check("Dashboard returns alert_history", "alert_history" in dash)
check("Dashboard returns reorder_recommendations", "reorder_recommendations" in dash)
check("Dashboard returns reorder_summary", "reorder_summary" in dash)
check("Dashboard returns recent_transactions", "recent_transactions" in dash)
check("Dashboard returns recent_notifications", "recent_notifications" in dash)

inv = dash["inventory_status"]
check("Total products is 10", inv["total_products"] == 10)
check("Low stock count >= 1", inv["low_stock_products"] >= 1)

notifs = dash["recent_notifications"]
check("Notifications in dashboard >= 2", len(notifs) >= 2)
print()

# ==============================================================
# STEP 10: Reorder status logic
# ==============================================================
print("=" * 60)
print("STEP 10: Reorder status update")
pending = tp_pending_reorders()
if pending:
    rid = pending[0]["recommendation_id"]
    updated = api_call("PATCH", f"/api/reorder/{rid}/status", {"status": "ORDERED"})
    check("Status updated to ORDERED", updated is not None and updated["status"] == "ORDERED")
    updated2 = api_call("PATCH", f"/api/reorder/{rid}/status", {"status": "COMPLETED"})
    check("Status updated to COMPLETED", updated2 is not None and updated2["status"] == "COMPLETED")
else:
    check("Has pending reorder to test", False)
print()

# ==============================================================
# CLEANUP: Restore stock to 50
# ==============================================================
print("=" * 60)
print("CLEANUP: Restoring stock to 50")
p = get_product()
if p["current_stock"] < 50:
    receipt(50 - p["current_stock"])
elif p["current_stock"] > 50:
    sale(p["current_stock"] - 50)
p = get_product()
print(f"  Final stock: {p['current_stock']}")
print()

# ==============================================================
# FINAL REPORT
# ==============================================================
print("=" * 60)
print(f"RESULTS: {PASS} passed, {FAIL} failed out of {PASS + FAIL} checks")
print("=" * 60)
if FAIL == 0:
    print("Backend core ready for frontend integration.")
else:
    print(f"WARNING: {FAIL} check(s) failed. Review output above.")
sys.exit(0 if FAIL == 0 else 1)

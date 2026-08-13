"""Test Dashboard Summary API"""
import json
import urllib.request

API = "http://localhost:8000"


def api_call(path):
    req = urllib.request.Request(f"{API}{path}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


print("Fetching GET /api/dashboard/summary ...")
print()

data = api_call("/api/dashboard/summary")

# --- Inventory Status ---
status = data["inventory_status"]
print("INVENTORY STATUS:")
print(f"  Total Products:      {status['total_products']}")
print(f"  Healthy:             {status['healthy_products']}")
print(f"  Low Stock:           {status['low_stock_products']}")
print(f"  Out of Stock:        {status['out_of_stock_products']}")
print(f"  Total Stock Units:   {status['total_stock_units']}")
print()

# --- Products ---
print(f"PRODUCTS ({len(data['products'])} total):")
for p in data["products"]:
    print(f"  {p['product_name']:20s} stock={p['current_stock']:4d}  threshold={p['minimum_threshold']:3d}  status={p['status']}")
print()

# --- Active Alerts ---
alerts = data["active_alerts"]
print(f"ACTIVE ALERTS ({len(alerts)}):")
for a in alerts:
    pname = a.get("products", {}).get("product_name", "?") if a.get("products") else "?"
    print(f"  {pname}: {a['alert_type']} ({a['severity']}) - {a['message']}")
print()

# --- Alert History ---
history = data["alert_history"]
print(f"ALERT HISTORY ({len(history)} recent):")
for a in history[:5]:
    pname = a.get("products", {}).get("product_name", "?") if a.get("products") else "?"
    print(f"  {pname}: {a['alert_type']} | {a['status']} | created={a['created_at'][:19]}")
if len(history) > 5:
    print(f"  ... and {len(history) - 5} more")
print()

# --- Reorder Summary ---
rs = data["reorder_summary"]
print("REORDER SUMMARY:")
print(f"  Pending:             {rs['pending_reorders']}")
print(f"  Ordered:             {rs['ordered_reorders']}")
print(f"  Completed:           {rs['completed_reorders']}")
print(f"  Total Rec. Units:    {rs['total_recommended_units']}")
print()

# --- Reorder Recommendations ---
recs = data["reorder_recommendations"]
print(f"REORDER RECOMMENDATIONS ({len(recs)}):")
for r in recs[:5]:
    pname = r.get("products", {}).get("product_name", "?") if r.get("products") else "?"
    print(f"  {pname}: qty={r['recommended_quantity']} status={r['status']} demand={r['average_daily_demand']}")
if len(recs) > 5:
    print(f"  ... and {len(recs) - 5} more")
print()

# --- Recent Transactions ---
txns = data["recent_transactions"]
print(f"RECENT TRANSACTIONS ({len(txns)}):")
for t in txns[:5]:
    pname = t.get("products", {}).get("product_name", "?") if t.get("products") else "?"
    print(f"  {pname}: {t['transaction_type']} qty={t['quantity']} at {t['created_at'][:19]}")
if len(txns) > 5:
    print(f"  ... and {len(txns) - 5} more")
print()

print("=" * 60)
print("Dashboard summary test COMPLETE")

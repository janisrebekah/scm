from app.database import supabase


def get_inventory_summary():
    """
    Build a complete dashboard summary from Supabase data.

    Returns inventory status, active alerts, alert history,
    reorder summary, and per-product stock details.
    """

    # 1. Fetch all products
    products_response = (
        supabase
        .table("products")
        .select("*")
        .order("product_name")
        .execute()
    )
    products = products_response.data

    # 2. Classify products by stock status
    healthy = []
    low_stock = []
    out_of_stock = []
    total_stock_units = 0

    for p in products:
        current = p["current_stock"]
        threshold = p["minimum_threshold"]
        total_stock_units += current

        if current == 0:
            p["status"] = "OUT_OF_STOCK"
            out_of_stock.append(p)
        elif current <= threshold:
            p["status"] = "LOW_STOCK"
            low_stock.append(p)
        else:
            p["status"] = "HEALTHY"
            healthy.append(p)

    inventory_status = {
        "total_products": len(products),
        "healthy_products": len(healthy),
        "low_stock_products": len(low_stock),
        "out_of_stock_products": len(out_of_stock),
        "total_stock_units": total_stock_units,
    }

    # 3. Fetch active alerts with product name join
    active_alerts_response = (
        supabase
        .table("alerts")
        .select("*, products(product_name, current_stock, minimum_threshold)")
        .eq("status", "ACTIVE")
        .order("created_at", desc=True)
        .execute()
    )
    active_alerts = active_alerts_response.data

    # 4. Fetch complete alert history (all alerts, newest first)
    alert_history_response = (
        supabase
        .table("alerts")
        .select("*, products(product_name, current_stock, minimum_threshold)")
        .order("created_at", desc=True)
        .execute()
    )
    alert_history = alert_history_response.data

    # 5. Fetch all reorder recommendations with product name
    reorder_response = (
        supabase
        .table("reorder_recommendations")
        .select("*, products(product_name)")
        .order("created_at", desc=True)
        .execute()
    )
    reorder_recommendations = reorder_response.data

    # 6. Compute reorder summary counts
    pending_count = 0
    ordered_count = 0
    completed_count = 0
    total_recommended_units = 0

    for r in reorder_recommendations:
        status = r["status"]
        if status == "PENDING":
            pending_count += 1
            total_recommended_units += r["recommended_quantity"]
        elif status == "ORDERED":
            ordered_count += 1
            total_recommended_units += r["recommended_quantity"]
        elif status == "COMPLETED":
            completed_count += 1

    reorder_summary = {
        "pending_reorders": pending_count,
        "ordered_reorders": ordered_count,
        "completed_reorders": completed_count,
        "total_recommended_units": total_recommended_units,
    }

    # 7. Recent transactions (last 20)
    transactions_response = (
        supabase
        .table("inventory_transactions")
        .select("*, products(product_name)")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    recent_transactions = transactions_response.data

    # 8. Recent notifications (last 20)
    notifications_response = (
        supabase
        .table("notifications")
        .select("*, alerts(alert_type, severity, product_id)")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    recent_notifications = notifications_response.data

    return {
        "inventory_status": inventory_status,
        "products": products,
        "active_alerts": active_alerts,
        "alert_history": alert_history,
        "reorder_recommendations": reorder_recommendations,
        "reorder_summary": reorder_summary,
        "recent_transactions": recent_transactions,
        "recent_notifications": recent_notifications,
    }

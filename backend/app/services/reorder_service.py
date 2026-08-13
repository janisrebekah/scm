from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.database import supabase


# Default lead time in days if not configurable per product
DEFAULT_LEAD_TIME_DAYS = 3

# Number of days of history to consider for demand calculation
DEMAND_LOOKBACK_DAYS = 30


def _get_product(product_id: UUID):
    """Fetch a single product by ID."""
    response = (
        supabase
        .table("products")
        .select("*")
        .eq("product_id", str(product_id))
        .single()
        .execute()
    )

    return response.data


def _get_demand_transactions(product_id: UUID, lookback_days: int = DEMAND_LOOKBACK_DAYS):
    """
    Fetch SALE and CONSUMPTION transactions for a product
    within the lookback window.

    These transactions have NEGATIVE quantities in the database,
    so we take the absolute value when calculating demand.
    """
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    response = (
        supabase
        .table("inventory_transactions")
        .select("quantity, created_at")
        .eq("product_id", str(product_id))
        .in_("transaction_type", ["SALE", "CONSUMPTION"])
        .gte("created_at", since.isoformat())
        .order("created_at")
        .execute()
    )

    return response.data


def calculate_average_daily_demand(product_id: UUID, lookback_days: int = DEMAND_LOOKBACK_DAYS):
    """
    Calculate average daily demand from historical SALE and CONSUMPTION
    transactions over the lookback period.

    Quantities are stored as negative in the DB for SALE/CONSUMPTION,
    so we use abs() to get the actual demand units.

    Returns 0.0 if no transactions exist.
    """
    transactions = _get_demand_transactions(product_id, lookback_days)

    if not transactions:
        return 0.0

    total_demand = sum(abs(t["quantity"]) for t in transactions)

    # Use the actual number of days spanned by the data, minimum 1
    days_active = lookback_days
    if len(transactions) >= 2:
        first = datetime.fromisoformat(transactions[0]["created_at"])
        last = datetime.fromisoformat(transactions[-1]["created_at"])
        span = (last - first).days
        if span > 0:
            days_active = span

    average_daily_demand = total_demand / max(days_active, 1)

    return round(average_daily_demand, 2)


def calculate_reorder_point(average_daily_demand: float, lead_time_days: int, safety_stock: int):
    """
    Reorder Point = Average Daily Demand × Lead Time Days + Safety Stock
    """
    return round(average_daily_demand * lead_time_days + safety_stock, 2)


def calculate_recommended_quantity(reorder_point: float, current_stock: int):
    """
    Recommended Quantity = Reorder Point − Current Stock
    If negative, return 0.
    """
    quantity = reorder_point - current_stock
    return max(int(quantity), 0)


def _get_pending_recommendation(product_id: UUID):
    """Check if a PENDING reorder recommendation already exists for a product."""
    response = (
        supabase
        .table("reorder_recommendations")
        .select("*")
        .eq("product_id", str(product_id))
        .eq("status", "PENDING")
        .execute()
    )

    if response.data:
        return response.data[0]

    return None


def generate_reorder_recommendation(product_id: UUID):
    """
    Generate or update a reorder recommendation for a product.

    This is the main entry point called after stock evaluation
    determines that a product is LOW_STOCK or OUT_OF_STOCK.

    Steps:
    1. Fetch product data
    2. Calculate average daily demand from SALE/CONSUMPTION history
    3. Calculate reorder point
    4. Calculate recommended quantity
    5. Upsert into reorder_recommendations table

    Returns the recommendation record, or None if no reorder is needed.
    """
    product = _get_product(product_id)

    if not product:
        return None

    current_stock = product["current_stock"]
    safety_stock = product["safety_stock"]
    minimum_threshold = product["minimum_threshold"]
    lead_time_days = DEFAULT_LEAD_TIME_DAYS

    # Step 1: Calculate average daily demand
    avg_demand = calculate_average_daily_demand(product_id)

    # Step 2: Calculate reorder point
    reorder_point = calculate_reorder_point(avg_demand, lead_time_days, safety_stock)

    # Step 3: Calculate recommended quantity
    recommended_qty = calculate_recommended_quantity(reorder_point, current_stock)

    # Step 4: When stock is at or below threshold but formula yields 0,
    # use the product's configured reorder_quantity as a sensible floor
    if current_stock <= minimum_threshold and recommended_qty == 0:
        recommended_qty = product["reorder_quantity"]

    # Only skip if stock is healthy (above threshold) and formula says no reorder
    if recommended_qty == 0 and current_stock > minimum_threshold:
        return None

    # Step 4: Check for existing PENDING recommendation
    existing = _get_pending_recommendation(product_id)

    if existing:
        # Update the existing recommendation with fresh calculations
        response = (
            supabase
            .table("reorder_recommendations")
            .update({
                "current_stock": current_stock,
                "average_daily_demand": avg_demand,
                "lead_time_days": lead_time_days,
                "safety_stock": safety_stock,
                "reorder_point": reorder_point,
                "recommended_quantity": recommended_qty,
            })
            .eq("recommendation_id", existing["recommendation_id"])
            .execute()
        )

        return response.data[0] if response.data else existing

    # Step 5: Create new recommendation
    response = (
        supabase
        .table("reorder_recommendations")
        .insert({
            "product_id": str(product_id),
            "current_stock": current_stock,
            "average_daily_demand": avg_demand,
            "lead_time_days": lead_time_days,
            "safety_stock": safety_stock,
            "reorder_point": reorder_point,
            "recommended_quantity": recommended_qty,
            "status": "PENDING",
        })
        .execute()
    )

    return response.data[0] if response.data else None


def get_all_recommendations():
    """Fetch all reorder recommendations, newest first."""
    response = (
        supabase
        .table("reorder_recommendations")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return response.data


def get_pending_recommendations():
    """Fetch only PENDING reorder recommendations."""
    response = (
        supabase
        .table("reorder_recommendations")
        .select("*")
        .eq("status", "PENDING")
        .order("created_at", desc=True)
        .execute()
    )

    return response.data


def update_recommendation_status(recommendation_id: UUID, new_status: str):
    """
    Update the status of a reorder recommendation.
    Valid transitions: PENDING → ORDERED → COMPLETED
                       PENDING → CANCELLED
    """
    valid_statuses = {"PENDING", "ORDERED", "COMPLETED", "CANCELLED"}

    if new_status not in valid_statuses:
        return None

    response = (
        supabase
        .table("reorder_recommendations")
        .update({
            "status": new_status,
        })
        .eq("recommendation_id", str(recommendation_id))
        .execute()
    )

    return response.data[0] if response.data else None

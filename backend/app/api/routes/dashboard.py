from fastapi import APIRouter

from app.services.inventory_service import get_inventory_summary


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def dashboard_summary():
    """
    Returns the complete dashboard summary including:
    - inventory_status (counts and totals)
    - products (all products with computed status)
    - active_alerts (with product details)
    - alert_history (recent alerts)
    - reorder_recommendations (with product details)
    - reorder_summary (aggregated counts)
    - recent_transactions (last 20)
    """
    return get_inventory_summary()

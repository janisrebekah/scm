"""
Notification Service

Creates notification records when alerts are triggered.
Sends notifications via the configured SMS provider.
Prevents duplicate notifications for the same active alert.
"""
from uuid import UUID

from app.database import supabase
from app.services.sms_provider import send_sms


# Default recipient for all notifications (configurable)
DEFAULT_RECIPIENT = "+1234567890"


def _has_existing_notification(alert_id: str) -> bool:
    """
    Check if a notification already exists for a given alert.
    Prevents duplicate notifications for the same active alert.
    """
    response = (
        supabase
        .table("notifications")
        .select("notification_id")
        .eq("alert_id", alert_id)
        .execute()
    )

    return bool(response.data)


def build_alert_message(
    product_name: str,
    alert_type: str,
    current_stock: int,
    minimum_threshold: int,
    recommended_quantity: int | None = None,
) -> str:
    """
    Build a human-readable notification message for an alert.
    """
    if alert_type == "OUT_OF_STOCK":
        msg = f"ALERT: {product_name} is OUT OF STOCK."
    else:
        msg = f"ALERT: {product_name} stock is low."

    msg += f"\nCurrent stock: {current_stock}."
    msg += f"\nMinimum threshold: {minimum_threshold}."

    if recommended_quantity and recommended_quantity > 0:
        msg += f"\nRecommended reorder: {recommended_quantity} units."

    return msg


def send_alert_notification(
    alert: dict,
    product: dict,
    reorder_recommendation: dict | None = None,
    recipient: str | None = None,
) -> dict | None:
    """
    Create a notification record and send via SMS for a given alert.

    Prevents duplicates: if a notification already exists for this alert_id,
    it will not send again.

    Args:
        alert: The alert record (must include alert_id, alert_type)
        product: The product record (must include product_name, current_stock, minimum_threshold)
        reorder_recommendation: Optional reorder recommendation record
        recipient: Optional recipient override (defaults to DEFAULT_RECIPIENT)

    Returns:
        The notification record if created, None if duplicate or no alert.
    """
    if not alert:
        return None

    alert_id = alert["alert_id"]

    # Prevent duplicate notifications for the same alert
    if _has_existing_notification(alert_id):
        return None

    # Build the message
    rec_qty = None
    if reorder_recommendation:
        rec_qty = reorder_recommendation.get("recommended_quantity")

    message = build_alert_message(
        product_name=product["product_name"],
        alert_type=alert["alert_type"],
        current_stock=product["current_stock"],
        minimum_threshold=product["minimum_threshold"],
        recommended_quantity=rec_qty,
    )

    target = recipient or DEFAULT_RECIPIENT

    # Send via SMS provider
    sms_result = send_sms(recipient=target, message=message)

    # Create notification record in Supabase
    notification_data = {
        "alert_id": alert_id,
        "recipient": target,
        "channel": "SMS",
        "message": message,
        "status": sms_result["status"],
        "sent_at": sms_result["sent_at"],
    }

    response = (
        supabase
        .table("notifications")
        .insert(notification_data)
        .execute()
    )

    return response.data[0] if response.data else None


def get_all_notifications():
    """Fetch all notifications, newest first."""
    response = (
        supabase
        .table("notifications")
        .select("*, alerts(alert_type, severity, product_id)")
        .order("created_at", desc=True)
        .execute()
    )

    return response.data


def get_notifications_for_alert(alert_id: str):
    """Fetch notifications for a specific alert."""
    response = (
        supabase
        .table("notifications")
        .select("*")
        .eq("alert_id", alert_id)
        .order("created_at", desc=True)
        .execute()
    )

    return response.data

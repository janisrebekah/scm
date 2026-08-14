"""
Notification Service

Creates notification records when alerts are triggered.
Sends low-stock notifications via email.
Prevents duplicate notifications for the same active alert.
"""

import os

from dotenv import load_dotenv

load_dotenv()

from app.database import supabase
from app.services.email_service import send_email


# Default recipient is loaded from the environment when needed
DEFAULT_RECIPIENT = None


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
    Create a notification record and send an email for a given alert.

    Prevents duplicates: if a notification already exists for this alert_id,
    it will not send again.
    """

    if not alert:
        return None

    alert_id = alert["alert_id"]

    # Prevent duplicate notifications for the same alert
    if _has_existing_notification(alert_id):
        return None

    # Get recommended reorder quantity
    rec_qty = None

    if reorder_recommendation:
        rec_qty = reorder_recommendation.get("recommended_quantity")

    # Build alert message
    message = build_alert_message(
        product_name=product["product_name"],
        alert_type=alert["alert_type"],
        current_stock=product["current_stock"],
        minimum_threshold=product["minimum_threshold"],
        recommended_quantity=rec_qty,
    )

    # Load supervisor email when the notification is triggered
    target = recipient or os.getenv("SUPERVISOR_EMAIL")

    if not target:
        raise ValueError(
            "SUPERVISOR_EMAIL is not configured in the environment."
        )

    # Send email
    email_result = send_email(
        recipient=target,
        subject=f"Smart Restock Alert - {product['product_name']}",
        message=message,
    )

    # Create notification record in Supabase
    notification_data = {
        "alert_id": alert_id,
        "recipient": target,
        "channel": "EMAIL",
        "message": message,
        "status": email_result["status"],
        "sent_at": email_result["sent_at"],
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
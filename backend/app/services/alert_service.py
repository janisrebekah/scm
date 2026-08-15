from uuid import UUID

from app.database import supabase


def get_product(product_id: UUID):
    response = (
        supabase
        .table("products")
        .select("*")
        .eq("product_id", str(product_id))
        .single()
        .execute()
    )

    return response.data


def get_active_alert(product_id: UUID):
    response = (
        supabase
        .table("alerts")
        .select("*")
        .eq("product_id", str(product_id))
        .eq("status", "ACTIVE")
        .execute()
    )

    if response.data:
        return response.data[0]

    return None


def create_alert(
    product_id: UUID,
    alert_type: str,
    severity: str,
    message: str
):
    response = (
        supabase
        .table("alerts")
        .insert({
            "product_id": str(product_id),
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "status": "ACTIVE"
        })
        .execute()
    )

    return response.data[0]


def resolve_active_alert(product_id: UUID):
    active_alert = get_active_alert(product_id)

    if not active_alert:
        return

    (
        supabase
        .table("alerts")
        .update({
            "status": "RESOLVED",
            "resolved_at": "now()"
        })
        .eq("alert_id", active_alert["alert_id"])
        .execute()
    )


def resolve_stale_active_alerts(products: list[dict]):
    product_by_id = {
        str(product["product_id"]): product
        for product in products
    }

    active_alerts_response = (
        supabase
        .table("alerts")
        .select("*")
        .eq("status", "ACTIVE")
        .execute()
    )

    for alert in active_alerts_response.data or []:
        product = product_by_id.get(str(alert["product_id"]))
        if not product:
            continue

        current_stock = product["current_stock"]
        threshold = product["minimum_threshold"]

        if current_stock >= threshold:
            (
                supabase
                .table("alerts")
                .update({
                    "status": "RESOLVED",
                    "resolved_at": "now()"
                })
                .eq("alert_id", alert["alert_id"])
                .execute()
            )


def evaluate_stock(product_id: UUID):
    product = get_product(product_id)

    if not product:
        return None

    current_stock = product["current_stock"]
    threshold = product["minimum_threshold"]

    # OUT OF STOCK
    if current_stock == 0:

        existing_alert = get_active_alert(product_id)

        if existing_alert:
            return existing_alert

        return create_alert(
            product_id=product_id,
            alert_type="OUT_OF_STOCK",
            severity="CRITICAL",
            message=(
                f"{product['product_name']} is out of stock."
            )
        )

    # LOW STOCK
    if current_stock < threshold:

        existing_alert = get_active_alert(product_id)

        if existing_alert:
            return existing_alert

        return create_alert(
            product_id=product_id,
            alert_type="LOW_STOCK",
            severity="HIGH",
            message=(
                f"{product['product_name']} stock is low. "
                f"Current stock: {current_stock}. "
                f"Minimum threshold: {threshold}."
            )
        )

    # HEALTHY
    resolve_active_alert(product_id)

    return None

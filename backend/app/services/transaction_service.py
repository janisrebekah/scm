from uuid import UUID

from fastapi import HTTPException

from app.database import supabase
from app.services.alert_service import evaluate_stock
from app.services.reorder_service import generate_reorder_recommendation
from app.services.notification_service import send_alert_notification


def _get_product(product_id: UUID):
    response = (
        supabase
        .table("products")
        .select("*")
        .eq("product_id", str(product_id))
        .single()
        .execute()
    )

    return response.data


def _record_transaction(
    product_id: UUID,
    transaction_type: str,
    quantity: int,
    reason: str | None = None,
    adjustment_reason: str | None = None,
):
    # 1. Get the product
    product = _get_product(product_id)

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    # 2. Get current stock
    current_stock = product["current_stock"]

    # 3. Calculate new stock
    new_stock = current_stock + quantity

    # 4. Prevent negative stock
    if new_stock < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock. "
                f"Current stock: {current_stock}, "
                f"requested change: {quantity}"
            ),
        )

    # 5. Update product stock
    stock_response = (
        supabase
        .table("products")
        .update({
            "current_stock": new_stock,
        })
        .eq("product_id", str(product_id))
        .execute()
    )

    if not stock_response.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to update product stock",
        )

    # 6. Record inventory transaction
    insert_data = {
        "product_id": str(product_id),
        "transaction_type": transaction_type,
        "quantity": quantity,
        "reason": reason,
    }
    if adjustment_reason:
        insert_data["adjustment_reason"] = adjustment_reason

    transaction_response = (
        supabase
        .table("inventory_transactions")
        .insert(insert_data)
        .execute()
    )

    if not transaction_response.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to record inventory transaction",
        )

    transaction_data = transaction_response.data[0]

    # 7. Evaluate stock after transaction
    alert_result = evaluate_stock(product_id)

    # 8. Evaluate reorder recommendation based on current stock state
    reorder_result = None
    if new_stock <= product["minimum_threshold"]:
        reorder_result = generate_reorder_recommendation(product_id)

    # 9. Send notification if an alert was created
    notification_result = None
    if alert_result:
        # Re-fetch product to get updated current_stock
        updated_product = _get_product(product_id)
        notification_result = send_alert_notification(
            alert=alert_result,
            product=updated_product,
            reorder_recommendation=reorder_result,
        )

    # 10. Return transaction with context
    transaction_data["previous_stock"] = current_stock
    transaction_data["new_stock"] = new_stock
    transaction_data["alert"] = alert_result
    transaction_data["reorder_recommendation"] = reorder_result
    transaction_data["notification"] = notification_result

    return transaction_data


def record_sale(
    product_id: UUID,
    quantity: int,
    reason: str | None = None,
):
    """
    Records a customer sale.

    Example:
    Current stock = 50
    Sale = 10
    New stock = 40
    """

    return _record_transaction(
        product_id=product_id,
        transaction_type="SALE",
        quantity=-quantity,
        reason=reason or "Customer sale",
    )


def record_consumption(
    product_id: UUID,
    quantity: int,
    reason: str | None = None,
):
    """
    Records stock consumption.

    Example:
    Current stock = 50
    Consumption = 5
    New stock = 45
    """

    return _record_transaction(
        product_id=product_id,
        transaction_type="CONSUMPTION",
        quantity=-quantity,
        reason=reason or "Stock consumption",
    )


def record_receipt(
    product_id: UUID,
    quantity: int,
    reason: str | None = None,
):
    """
    Records stock received from a supplier.

    Example:
    Current stock = 20
    Receipt = 50
    New stock = 70
    """

    return _record_transaction(
        product_id=product_id,
        transaction_type="RECEIPT",
        quantity=quantity,
        reason=reason or "Stock receipt",
    )


def record_adjustment(
    product_id: UUID,
    quantity: int,
    reason: str,
    adjustment_reason: str = "OTHER",
):
    """
    Records a manual stock adjustment.

    Positive quantity = stock increase
    Negative quantity = stock decrease

    adjustment_reason must be one of:
    DAMAGED, EXPIRED, LOST, STOCK_CORRECTION, OTHER

    Example:
    +5 = found stock (STOCK_CORRECTION)
    -5 = damaged stock (DAMAGED)
    """

    return _record_transaction(
        product_id=product_id,
        transaction_type="ADJUSTMENT",
        quantity=quantity,
        reason=reason,
        adjustment_reason=adjustment_reason,
    )


def record_incoming(
    product_id: UUID,
    quantity: int,
):
    """
    Records an incoming stock transaction.

    Example:
    Current stock = 20
    Incoming = 50
    New stock = 70
    """

    return _record_transaction(
        product_id=product_id,
        transaction_type="IN",
        quantity=quantity,
        reason="Incoming stock",
    )


def record_outgoing(
    product_id: UUID,
    quantity: int,
):
    """
    Records an outgoing stock transaction.

    _record_transaction expects a signed quantity where
    new_stock = current_stock + quantity, so we negate here.

    Example:
    Current stock = 50
    Outgoing = 20
    New stock = 30
    """

    return _record_transaction(
        product_id=product_id,
        transaction_type="OUT",
        quantity=-quantity,
        reason="Outgoing stock",
    )


def get_transactions(transaction_type: str | None = None):
    """
    Fetches transaction history with product name join.
    Optionally filters by transaction_type (e.g. 'IN', 'OUT').
    """

    query = (
        supabase
        .table("inventory_transactions")
        .select("*, products(product_name)")
        .order("created_at", desc=True)
        .limit(100)
    )

    if transaction_type:
        query = query.eq("transaction_type", transaction_type)

    response = query.execute()
    return response.data
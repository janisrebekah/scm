from uuid import UUID

from fastapi import HTTPException

from app.database import supabase
from app.services.alert_service import evaluate_stock


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
    transaction_response = (
        supabase
        .table("inventory_transactions")
        .insert({
            "product_id": str(product_id),
            "transaction_type": transaction_type,
            "quantity": quantity,
            "reason": reason,
        })
        .execute()
    )

    if not transaction_response.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to record inventory transaction",
        )

    transaction_data = transaction_response.data[0]

    # 7. Evaluate stock after transaction
    evaluate_stock(product_id)

    # 8. Return transaction
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
):
    """
    Records a manual stock adjustment.

    Positive quantity = stock increase
    Negative quantity = stock decrease

    Example:
    +5 = found stock
    -5 = damaged stock
    """

    return _record_transaction(
        product_id=product_id,
        transaction_type="ADJUSTMENT",
        quantity=quantity,
        reason=reason,
    )
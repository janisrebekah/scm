from fastapi import APIRouter

from app.schemas.transaction import (
    TransactionCreate,
    AdjustmentCreate,
    TransactionResponse
)

from app.services.transaction_service import (
    record_sale,
    record_consumption,
    record_receipt,
    record_adjustment,
    record_incoming,
    record_outgoing,
    get_transactions,
)


router = APIRouter(
    prefix="/api/transactions",
    tags=["Transactions"]
)


@router.get("")
def list_transactions(type: str | None = None):
    return get_transactions(transaction_type=type)


@router.post("/sale", response_model=TransactionResponse)
def sale(transaction: TransactionCreate):

    return record_sale(
        product_id=transaction.product_id,
        quantity=transaction.quantity,
        reason=transaction.reason
    )


@router.post("/consumption", response_model=TransactionResponse)
def consumption(transaction: TransactionCreate):

    return record_consumption(
        product_id=transaction.product_id,
        quantity=transaction.quantity,
        reason=transaction.reason
    )


@router.post("/receipt", response_model=TransactionResponse)
def receipt(transaction: TransactionCreate):

    return record_receipt(
        product_id=transaction.product_id,
        quantity=transaction.quantity,
        reason=transaction.reason
    )


@router.post("/adjustment", response_model=TransactionResponse)
def adjustment(transaction: AdjustmentCreate):

    return record_adjustment(
        product_id=transaction.product_id,
        quantity=transaction.quantity,
        reason=transaction.reason,
        adjustment_reason=transaction.adjustment_reason.value,
    )


@router.post("/in", response_model=TransactionResponse)
def incoming(transaction: TransactionCreate):

    return record_incoming(
        product_id=transaction.product_id,
        quantity=transaction.quantity,
    )


@router.post("/out", response_model=TransactionResponse)
def outgoing(transaction: TransactionCreate):

    return record_outgoing(
        product_id=transaction.product_id,
        quantity=transaction.quantity,
    )
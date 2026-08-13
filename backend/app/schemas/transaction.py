from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Any


class TransactionCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)
    reason: str | None = None


class AdjustmentCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(ne=0)
    reason: str = Field(min_length=1, max_length=255)


class TransactionResponse(BaseModel):
    transaction_id: UUID
    product_id: UUID
    transaction_type: str
    quantity: int
    reason: str | None
    created_at: datetime

    # Enriched context from post-transaction evaluation
    previous_stock: int | None = None
    new_stock: int | None = None
    alert: dict[str, Any] | None = None
    reorder_recommendation: dict[str, Any] | None = None
    notification: dict[str, Any] | None = None
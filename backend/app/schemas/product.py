from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class ProductBase(BaseModel):
    product_name: str = Field(min_length=1, max_length=255)
    category: str | None = None
    unit_price: float = Field(default=0, ge=0)
    current_stock: int = Field(default=0, ge=0)
    minimum_threshold: int = Field(default=10, ge=0)
    safety_stock: int = Field(default=5, ge=0)
    reorder_quantity: int = Field(default=50, gt=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    product_name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = None
    unit_price: float | None = Field(default=None, ge=0)
    minimum_threshold: int | None = Field(default=None, ge=0)
    safety_stock: int | None = Field(default=None, ge=0)
    reorder_quantity: int | None = Field(default=None, gt=0)


class ProductResponse(ProductBase):
    product_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }
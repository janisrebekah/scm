from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class ReorderRecommendationResponse(BaseModel):
    recommendation_id: UUID
    product_id: UUID
    current_stock: int
    average_daily_demand: float
    lead_time_days: int
    safety_stock: int
    reorder_point: float
    recommended_quantity: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class ReorderStatusUpdate(BaseModel):
    status: str


class ReorderQuantityUpdate(BaseModel):
    recommended_quantity: int = Field(ge=1, description="Must be a positive integer")


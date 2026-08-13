from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AlertResponse(BaseModel):
    alert_id: UUID
    product_id: UUID
    alert_type: str
    severity: str
    message: str
    status: str
    created_at: datetime
    resolved_at: datetime | None = None
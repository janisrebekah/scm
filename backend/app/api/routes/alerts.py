from fastapi import APIRouter

from app.database import supabase
from app.schemas.alert import AlertResponse


router = APIRouter(
    prefix="/api/alerts",
    tags=["Alerts"]
)


@router.get("", response_model=list[AlertResponse])
def get_alerts():

    response = (
        supabase
        .table("alerts")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return response.data


@router.get("/active", response_model=list[AlertResponse])
def get_active_alerts():

    response = (
        supabase
        .table("alerts")
        .select("*")
        .eq("status", "ACTIVE")
        .order("created_at", desc=True)
        .execute()
    )

    return response.data
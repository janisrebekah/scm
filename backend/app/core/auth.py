from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client

from app.config import settings


security = HTTPBearer()

supabase = create_client(
    settings.supabase_url,
    settings.supabase_key
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    if not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = str(response.user.id)

    profile_response = (
        supabase
        .table("profiles")
        .select("profile_id, full_name, email, role")
        .eq("profile_id", user_id)
        .single()
        .execute()
    )

    profile = profile_response.data

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found"
        )

    if profile["role"] not in ["admin", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not authorized for inventory management"
        )

    return {
        "user_id": user_id,
        "email": profile["email"],
        "role": profile["role"],
        "full_name": profile["full_name"]
    }
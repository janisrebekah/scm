from fastapi import HTTPException, status
from supabase import create_client

from app.config import settings


supabase = create_client(
    settings.supabase_url,
    settings.supabase_key
)


def login_user(email: str, password: str):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not response.user or not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
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
        "access_token": response.session.access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "role": profile["role"],
        "full_name": profile["full_name"]
    }
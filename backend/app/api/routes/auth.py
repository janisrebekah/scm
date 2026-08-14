from fastapi import APIRouter, Depends

from app.schemas.auth import LoginRequest, LoginResponse
from app.services.auth_service import login_user
from app.core.auth import get_current_user


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    return login_user(
        request.email,
        request.password
    )


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return current_user
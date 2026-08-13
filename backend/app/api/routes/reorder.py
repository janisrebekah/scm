from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.schemas.reorder import (
    ReorderRecommendationResponse,
    ReorderStatusUpdate,
)

from app.services.reorder_service import (
    get_all_recommendations,
    get_pending_recommendations,
    generate_reorder_recommendation,
    update_recommendation_status,
)


router = APIRouter(
    prefix="/api/reorder",
    tags=["Reorder Recommendations"]
)


@router.get("", response_model=list[ReorderRecommendationResponse])
def list_recommendations():
    """Get all reorder recommendations."""
    return get_all_recommendations()


@router.get("/pending", response_model=list[ReorderRecommendationResponse])
def list_pending_recommendations():
    """Get only PENDING reorder recommendations."""
    return get_pending_recommendations()


@router.post("/{product_id}", response_model=ReorderRecommendationResponse)
def create_recommendation(product_id: UUID):
    """
    Manually trigger reorder recommendation generation for a product.
    Useful for testing; in normal flow this is triggered automatically
    after a low-stock alert.
    """
    result = generate_reorder_recommendation(product_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Product not found or no reorder needed"
        )

    return result


@router.patch("/{recommendation_id}/status", response_model=ReorderRecommendationResponse)
def change_recommendation_status(
    recommendation_id: UUID,
    body: ReorderStatusUpdate,
):
    """
    Update recommendation status.
    Valid statuses: PENDING, ORDERED, COMPLETED, CANCELLED
    """
    result = update_recommendation_status(recommendation_id, body.status)

    if not result:
        raise HTTPException(
            status_code=400,
            detail="Invalid status or recommendation not found"
        )

    return result

from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
)

from app.services.product_service import (
    get_all_products,
    get_product,
    create_product,
    update_product,
    delete_product,
)


router = APIRouter(
    prefix="/api/products",
    tags=["Products"]
)


@router.get("", response_model=list[ProductResponse])
def list_products():
    return get_all_products()


@router.get("/{product_id}", response_model=ProductResponse)
def read_product(product_id: UUID):

    product = get_product(product_id)

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


@router.post("", response_model=ProductResponse, status_code=201)
def add_product(product: ProductCreate):

    return create_product(
        product.model_dump(mode='json')
    )


@router.put("/{product_id}", response_model=ProductResponse)
def edit_product(
    product_id: UUID,
    product: ProductUpdate
):

    data = product.model_dump(
        exclude_unset=True,
        mode='json'
    )

    if not data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    try:
        return update_product(
            product_id,
            data
        )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )


@router.delete("/{product_id}")
def remove_product(product_id: UUID):

    result = delete_product(product_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return {
        "message": "Product deleted successfully"
    }
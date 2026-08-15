from uuid import UUID
from app.database import supabase
from app.services.alert_service import evaluate_stock


def get_all_products():
    response = (
        supabase
        .table("products")
        .select("*")
        .order("product_name")
        .execute()
    )

    return response.data


def get_product(product_id: UUID):
    response = (
        supabase
        .table("products")
        .select("*")
        .eq("product_id", str(product_id))
        .single()
        .execute()
    )

    return response.data


def create_product(product_data: dict):
    response = (
        supabase
        .table("products")
        .insert(product_data)
        .execute()
    )

    return response.data[0]


def update_product(product_id: UUID, product_data: dict):
    response = (
        supabase
        .table("products")
        .update(product_data)
        .eq("product_id", str(product_id))
        .execute()
    )

    updated_product = response.data[0]

    if "current_stock" in product_data or "minimum_threshold" in product_data:
        evaluate_stock(product_id)

    return updated_product


def delete_product(product_id: UUID):
    response = (
        supabase
        .table("products")
        .delete()
        .eq("product_id", str(product_id))
        .execute()
    )

    return response.data

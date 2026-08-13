from fastapi import FastAPI

from app.api.routes.products import router as products_router
from app.api.routes.transactions import router as transactions_router
from app.api.routes.alerts import router as alerts_router


app = FastAPI(
    title="Smart Restock API",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "Smart Restock API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


app.include_router(products_router)
app.include_router(transactions_router)
app.include_router(alerts_router)
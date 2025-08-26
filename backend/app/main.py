"""
Main FastAPI application for AEC Axis.
"""
from fastapi import FastAPI

from backend.app.api.companies import router as companies_router
from backend.app.api.users import router as users_router

app = FastAPI(
    title="AEC Axis API",
    description="API for AEC Axis - Construction Supply Chain Optimization",
    version="1.0.0"
)

# Include routers
app.include_router(companies_router)
app.include_router(users_router)


@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "AEC Axis API is running"}
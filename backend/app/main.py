"""
Main FastAPI application for AEC Axis.
"""
from fastapi import FastAPI

from backend.app.api.auth import router as auth_router
from backend.app.api.companies import router as companies_router
from backend.app.api.users import router as users_router
from backend.app.api.projects import router as projects_router
from backend.app.api.suppliers import router as suppliers_router

app = FastAPI(
    title="AEC Axis API",
    description="API for AEC Axis - Construction Supply Chain Optimization",
    version="1.0.0"
)

# Include routers
app.include_router(auth_router)
app.include_router(companies_router)
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(suppliers_router)


@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "AEC Axis API is running"}
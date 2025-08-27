"""
Main FastAPI application for AEC Axis.
"""
from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.companies import router as companies_router
from app.api.users import router as users_router
from app.api.projects import router as projects_router
from app.api.suppliers import router as suppliers_router
from app.api.ifc_files import router as ifc_files_router
from app.api.materials import router as materials_router
from app.api.rfqs import router as rfqs_router
from app.api.websockets import router as websockets_router

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
app.include_router(ifc_files_router)
app.include_router(materials_router)
app.include_router(rfqs_router)
app.include_router(websockets_router)


@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "AEC Axis API is running"}
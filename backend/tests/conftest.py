"""
Pytest configuration and fixtures for AEC Axis tests.
"""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base, get_db
from app.services.cache_service import get_cache_service, NoOpCacheService


# Test database URL - using SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """
    Override database dependency for tests.
    """
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    """
    Create a fresh database session for each test.
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    Create a test client with database override.
    """
    from app.main import app
    
    app.dependency_overrides[get_db] = override_get_db
    # Use NoOp cache for tests to avoid Redis dependency  
    app.dependency_overrides[get_cache_service] = lambda: NoOpCacheService()
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def async_client(db_session):
    """
    Create an async test client with database override.
    """
    from app.main import app
    
    app.dependency_overrides[get_db] = override_get_db
    # Use NoOp cache for tests to avoid Redis dependency  
    app.dependency_overrides[get_cache_service] = lambda: NoOpCacheService()
    
    async with AsyncClient(app=app, base_url="http://test") as async_test_client:
        yield async_test_client
    
    app.dependency_overrides.clear()
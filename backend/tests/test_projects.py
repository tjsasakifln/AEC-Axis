import pytest
from datetime import date
from backend.app.db.models.user import User
from backend.app.db.models.company import Company
from backend.app.security import hash_password


@pytest.fixture
def test_user_data():
    """Fixture com dados de usuário para testes"""
    return {
        "email": "test@example.com",
        "password": "senha123",
        "full_name": "Test User"
    }


@pytest.fixture
def create_test_user(db_session, test_user_data):
    """Fixture que cria um usuário de teste no banco"""
    # Primeiro criar uma company
    company = Company(
        name="Test Company",
        cnpj="12.345.678/0001-90",
        address="Test Address"
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    
    # Criar usuário com senha hasheada
    hashed_password = hash_password(test_user_data["password"])
    user = User(
        email=test_user_data["email"],
        hashed_password=hashed_password,
        full_name=test_user_data["full_name"],
        company_id=company.id
    )
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture
def auth_token(client, create_test_user, test_user_data):
    """Fixture que obtém um token de autenticação válido"""
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    }
    
    response = client.post("/auth/token", json=login_data)
    assert response.status_code == 200
    
    token_data = response.json()
    return token_data["access_token"]


def test_create_project_success(client, auth_token):
    """Teste para verificar a criação bem-sucedida de um projeto com dados completos"""
    project_data = {
        "name": "Test Project",
        "address": "123 Test Street, Test City",
        "start_date": "2024-01-15"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/projects", json=project_data, headers=headers)
    
    assert response.status_code == 201
    response_data = response.json()
    
    assert response_data["name"] == project_data["name"]
    assert response_data["address"] == project_data["address"]
    assert response_data["start_date"] == project_data["start_date"]
    assert "id" in response_data
    assert "created_at" in response_data


def test_create_project_minimal_data_success(client, auth_token):
    """Teste para verificar a criação bem-sucedida de um projeto com dados mínimos"""
    project_data = {
        "name": "Minimal Project"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/projects", json=project_data, headers=headers)
    
    assert response.status_code == 201
    response_data = response.json()
    
    assert response_data["name"] == project_data["name"]
    assert "id" in response_data
    assert "created_at" in response_data


def test_create_project_missing_name_fails(client, auth_token):
    """Teste para verificar falha na criação de projeto sem campo name"""
    project_data = {
        "address": "123 Test Street, Test City",
        "start_date": "2024-01-15"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/projects", json=project_data, headers=headers)
    
    assert response.status_code == 422
    response_data = response.json()
    assert "detail" in response_data


def test_create_project_unauthenticated_fails(client):
    """Teste para verificar falha na criação de projeto sem autenticação"""
    project_data = {
        "name": "Unauthorized Project",
        "address": "123 Test Street, Test City",
        "start_date": "2024-01-15"
    }
    
    response = client.post("/projects", json=project_data)
    
    # FastAPI/HTTPBearer pode retornar 401 ou 403 quando não há token
    assert response.status_code in [401, 403]
    response_data = response.json()
    assert "detail" in response_data
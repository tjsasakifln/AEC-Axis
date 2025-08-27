import pytest
from app.db.models.user import User
from app.db.models.company import Company
from app.security import hash_password


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


def test_login_successful_with_valid_credentials(client, create_test_user, test_user_data):
    """Teste para login bem-sucedido com credenciais válidas"""
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    }
    
    response = client.post("/auth/token", json=login_data)
    
    assert response.status_code == 200
    response_data = response.json()
    
    # Verificar se retorna access_token
    assert "access_token" in response_data
    assert response_data["token_type"] == "bearer"
    assert isinstance(response_data["access_token"], str)
    assert len(response_data["access_token"]) > 0


def test_login_failure_with_wrong_password(client, create_test_user, test_user_data):
    """Teste para falha de login com senha incorreta"""
    login_data = {
        "email": test_user_data["email"],
        "password": "senha_incorreta"
    }
    
    response = client.post("/auth/token", json=login_data)
    
    assert response.status_code == 401
    response_data = response.json()
    assert "detail" in response_data
    assert "access_token" not in response_data


def test_login_failure_with_unregistered_email(client, db_session):
    """Teste para falha de login com e-mail não registado"""
    login_data = {
        "email": "naoregistrado@example.com",
        "password": "qualquer_senha"
    }
    
    response = client.post("/auth/token", json=login_data)
    
    assert response.status_code == 401
    response_data = response.json()
    assert "detail" in response_data
    assert "access_token" not in response_data


def test_login_missing_credentials(client, db_session):
    """Teste para falha de login com credenciais em falta"""
    # Teste sem email
    response = client.post("/auth/token", json={"password": "senha123"})
    assert response.status_code == 422
    
    # Teste sem password
    response = client.post("/auth/token", json={"email": "test@example.com"})
    assert response.status_code == 422
    
    # Teste sem dados
    response = client.post("/auth/token", json={})
    assert response.status_code == 422


def test_login_empty_credentials(client, db_session):
    """Teste para falha de login com credenciais vazias"""
    login_data = {
        "email": "",
        "password": ""
    }
    
    response = client.post("/auth/token", json=login_data)
    assert response.status_code == 422  # Pydantic validation error para email vazio
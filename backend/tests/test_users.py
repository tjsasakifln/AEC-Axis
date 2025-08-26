"""
Tests for users API endpoints.

Following TDD approach - these tests define the expected behavior
of the user registration endpoints before implementation.
"""
import pytest
from fastapi.testclient import TestClient


class TestUsersEndpoints:
    """Test class for users API endpoints."""
    
    def test_register_user_success(self, client: TestClient):
        """
        Test POST /users endpoint creates a new user successfully.
        
        Following TDD: This test defines the expected behavior before implementation.
        Expected status code: 201 (Created)
        """
        # Arrange - first create a company to associate the user with
        company_data = {
            "name": "Empresa Teste",
            "cnpj": "12.345.678/0001-90"
        }
        company_response = client.post("/companies", json=company_data)
        company_id = company_response.json()["id"]
        
        user_data = {
            "email": "usuario@teste.com",
            "full_name": "Usuário de Teste",
            "password": "senhaSegura123",
            "company_id": company_id
        }
        
        # Act - make the request
        response = client.post("/users", json=user_data)
        
        # Assert - verify the response
        assert response.status_code == 201
        
        response_data = response.json()
        assert response_data["email"] == user_data["email"]
        assert response_data["full_name"] == user_data["full_name"]
        assert response_data["company_id"] == user_data["company_id"]
        assert response_data["is_active"] is True
        assert "id" in response_data
        assert "created_at" in response_data
        assert "updated_at" in response_data
        # Password should not be returned in response
        assert "password" not in response_data
        assert "hashed_password" not in response_data
        
    def test_register_user_duplicate_email(self, client: TestClient):
        """
        Test POST /users endpoint fails when email already exists.
        
        Expected status code: 400 (Bad Request)
        """
        # Arrange - create a company first
        company_data = {
            "name": "Empresa Teste",
            "cnpj": "12.345.678/0001-90"
        }
        company_response = client.post("/companies", json=company_data)
        company_id = company_response.json()["id"]
        
        # Create first user
        user_data_1 = {
            "email": "usuario@duplicado.com",
            "full_name": "Primeiro Usuário",
            "password": "senha123",
            "company_id": company_id
        }
        client.post("/users", json=user_data_1)
        
        # Act - try to create second user with same email
        user_data_2 = {
            "email": "usuario@duplicado.com",  # Same email
            "full_name": "Segundo Usuário",
            "password": "outraSenha456",
            "company_id": company_id
        }
        response = client.post("/users", json=user_data_2)
        
        # Assert
        assert response.status_code == 400
        
    def test_register_user_missing_email(self, client: TestClient):
        """
        Test POST /users endpoint fails when email is missing.
        
        Expected status code: 422 (Unprocessable Entity)
        """
        # Arrange - create a company first
        company_data = {
            "name": "Empresa Teste",
            "cnpj": "12.345.678/0001-90"
        }
        company_response = client.post("/companies", json=company_data)
        company_id = company_response.json()["id"]
        
        user_data = {
            "full_name": "Usuário Sem Email",
            "password": "senha123",
            "company_id": company_id
            # email is missing
        }
        
        # Act
        response = client.post("/users", json=user_data)
        
        # Assert
        assert response.status_code == 422
        
    def test_register_user_missing_password(self, client: TestClient):
        """
        Test POST /users endpoint fails when password is missing.
        
        Expected status code: 422 (Unprocessable Entity)
        """
        # Arrange - create a company first
        company_data = {
            "name": "Empresa Teste",
            "cnpj": "12.345.678/0001-90"
        }
        company_response = client.post("/companies", json=company_data)
        company_id = company_response.json()["id"]
        
        user_data = {
            "email": "usuario@semsenha.com",
            "full_name": "Usuário Sem Senha",
            "company_id": company_id
            # password is missing
        }
        
        # Act
        response = client.post("/users", json=user_data)
        
        # Assert
        assert response.status_code == 422
        
    def test_register_user_missing_full_name(self, client: TestClient):
        """
        Test POST /users endpoint fails when full_name is missing.
        
        Expected status code: 422 (Unprocessable Entity)
        """
        # Arrange - create a company first
        company_data = {
            "name": "Empresa Teste",
            "cnpj": "12.345.678/0001-90"
        }
        company_response = client.post("/companies", json=company_data)
        company_id = company_response.json()["id"]
        
        user_data = {
            "email": "usuario@semnome.com",
            "password": "senha123",
            "company_id": company_id
            # full_name is missing
        }
        
        # Act
        response = client.post("/users", json=user_data)
        
        # Assert
        assert response.status_code == 422
        
    def test_register_user_missing_company_id(self, client: TestClient):
        """
        Test POST /users endpoint fails when company_id is missing.
        
        Expected status code: 422 (Unprocessable Entity)
        """
        # Arrange
        user_data = {
            "email": "usuario@semempresa.com",
            "full_name": "Usuário Sem Empresa",
            "password": "senha123"
            # company_id is missing
        }
        
        # Act
        response = client.post("/users", json=user_data)
        
        # Assert
        assert response.status_code == 422
        
    def test_register_user_invalid_company_id(self, client: TestClient):
        """
        Test POST /users endpoint fails when company_id doesn't exist.
        
        Expected status code: 400 (Bad Request)
        """
        # Arrange
        user_data = {
            "email": "usuario@empresainvalida.com",
            "full_name": "Usuário com Empresa Inválida",
            "password": "senha123",
            "company_id": 99999  # Non-existent company ID
        }
        
        # Act
        response = client.post("/users", json=user_data)
        
        # Assert
        assert response.status_code == 400
        
    def test_register_user_invalid_email_format(self, client: TestClient):
        """
        Test POST /users endpoint fails when email format is invalid.
        
        Expected status code: 422 (Unprocessable Entity)
        """
        # Arrange - create a company first
        company_data = {
            "name": "Empresa Teste",
            "cnpj": "12.345.678/0001-90"
        }
        company_response = client.post("/companies", json=company_data)
        company_id = company_response.json()["id"]
        
        user_data = {
            "email": "email-invalido-sem-arroba",  # Invalid email format
            "full_name": "Usuário com Email Inválido",
            "password": "senha123",
            "company_id": company_id
        }
        
        # Act
        response = client.post("/users", json=user_data)
        
        # Assert
        assert response.status_code == 422
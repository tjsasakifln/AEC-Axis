"""
Tests for companies API endpoints.

Following TDD approach - these tests define the expected behavior
of the companies endpoints before implementation.
"""
import pytest
from fastapi.testclient import TestClient


class TestCompaniesEndpoints:
    """Test class for companies API endpoints."""
    
    def test_create_company_success(self, client: TestClient):
        """
        Test POST /companies endpoint creates a new company successfully.
        
        Following TDD: This test defines the expected behavior before implementation.
        Expected status code: 201 (Created)
        """
        # Arrange - prepare test data
        company_data = {
            "name": "Construtora Exemplo LTDA",
            "cnpj": "12.345.678/0001-90",
            "email": "contato@exemplo.com",
            "address": "Rua das Obras, 123, São Paulo, SP",
            "phone": "(11) 1234-5678"
        }
        
        # Act - make the request
        response = client.post("/companies", json=company_data)
        
        # Assert - verify the response
        assert response.status_code == 201
        
        response_data = response.json()
        assert response_data["name"] == company_data["name"]
        assert response_data["cnpj"] == company_data["cnpj"]
        assert response_data["email"] == company_data["email"]
        assert response_data["address"] == company_data["address"]
        assert response_data["phone"] == company_data["phone"]
        assert "id" in response_data
        assert "created_at" in response_data
        assert "updated_at" in response_data
        
    def test_create_company_minimal_data(self, client: TestClient):
        """
        Test POST /companies endpoint with only required fields (name and cnpj).
        
        Based on the Company model, both 'name' and 'cnpj' are required.
        Expected status code: 201 (Created)
        """
        # Arrange
        company_data = {
            "name": "Empresa Mínima",
            "cnpj": "11.222.333/0001-44"
        }
        
        # Act
        response = client.post("/companies", json=company_data)
        
        # Assert
        assert response.status_code == 201
        
        response_data = response.json()
        assert response_data["name"] == company_data["name"]
        assert response_data["cnpj"] == company_data["cnpj"]
        assert response_data["email"] is None
        assert response_data["address"] is None
        assert response_data["phone"] is None
        assert "id" in response_data
        assert "created_at" in response_data
        assert "updated_at" in response_data
        
    def test_create_company_missing_name(self, client: TestClient):
        """
        Test POST /companies endpoint fails when name is missing.
        
        Expected status code: 422 (Unprocessable Entity)
        """
        # Arrange
        company_data = {
            "cnpj": "12.345.678/0001-90",
            "email": "contato@exemplo.com"
        }
        
        # Act
        response = client.post("/companies", json=company_data)
        
        # Assert
        assert response.status_code == 422
        
    def test_create_company_missing_cnpj(self, client: TestClient):
        """
        Test POST /companies endpoint fails when CNPJ is missing.
        
        Expected status code: 422 (Unprocessable Entity)
        """
        # Arrange
        company_data = {
            "name": "Empresa Sem CNPJ",
            "email": "contato@exemplo.com"
        }
        
        # Act
        response = client.post("/companies", json=company_data)
        
        # Assert
        assert response.status_code == 422
        
    def test_create_company_duplicate_cnpj(self, client: TestClient):
        """
        Test POST /companies endpoint fails when CNPJ already exists.
        
        Expected status code: 400 (Bad Request)
        """
        # Arrange - create first company
        company_data_1 = {
            "name": "Primeira Empresa",
            "cnpj": "12.345.678/0001-90"
        }
        client.post("/companies", json=company_data_1)
        
        # Act - try to create second company with same CNPJ
        company_data_2 = {
            "name": "Segunda Empresa",
            "cnpj": "12.345.678/0001-90"  # Same CNPJ
        }
        response = client.post("/companies", json=company_data_2)
        
        # Assert
        assert response.status_code == 400
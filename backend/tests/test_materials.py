import pytest
import uuid
from io import BytesIO
from unittest.mock import patch, MagicMock
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.ifc_file import IFCFile
from app.db.models.material import Material
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


@pytest.fixture
def test_project(client, auth_token):
    """Fixture que cria um projeto de teste"""
    project_data = {
        "name": "Test Project for Materials",
        "address": "123 Test Street"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/projects", json=project_data, headers=headers)
    assert response.status_code == 201
    
    return response.json()


@pytest.fixture
def test_ifc_file_with_materials(db_session, test_project, create_test_user):
    """Fixture que cria um arquivo IFC processado com materiais"""
    # Criar arquivo IFC
    ifc_file = IFCFile(
        original_filename="test_materials.ifc",
        file_path="ifc-files/test-materials.ifc",
        status="PROCESSED",
        project_id=uuid.UUID(test_project["id"])
    )
    db_session.add(ifc_file)
    db_session.commit()
    db_session.refresh(ifc_file)
    
    # Criar materiais associados
    materials_data = [
        {"description": "Concrete C25/30", "quantity": 150.5, "unit": "m³"},
        {"description": "Steel Rebar Ø12mm", "quantity": 2500.0, "unit": "kg"},
        {"description": "Brick 20x10x5cm", "quantity": 10000.0, "unit": "un"}
    ]
    
    materials = []
    for mat_data in materials_data:
        material = Material(
            description=mat_data["description"],
            quantity=mat_data["quantity"],
            unit=mat_data["unit"],
            ifc_file_id=ifc_file.id
        )
        db_session.add(material)
        materials.append(material)
    
    db_session.commit()
    
    return {"ifc_file": ifc_file, "materials": materials}


def test_get_materials_for_ifc_file_success(client, auth_token, test_ifc_file_with_materials):
    """Teste que, após simular o processamento de um arquivo, uma chamada GET para a rota de materiais retorna a lista correta de itens extraídos com status 200 OK"""
    ifc_file = test_ifc_file_with_materials["ifc_file"]
    expected_materials = test_ifc_file_with_materials["materials"]
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get(f"/ifc-files/{ifc_file.id}/materials", headers=headers)
    
    assert response.status_code == 200
    response_data = response.json()
    
    assert len(response_data) == 3
    
    # Verificar se todos os materiais estão presentes
    descriptions = [material["description"] for material in response_data]
    assert "Concrete C25/30" in descriptions
    assert "Steel Rebar Ø12mm" in descriptions
    assert "Brick 20x10x5cm" in descriptions
    
    # Verificar estrutura dos dados
    for material in response_data:
        assert "id" in material
        assert "description" in material
        assert "quantity" in material
        assert "unit" in material
        assert "ifc_file_id" in material
        assert material["ifc_file_id"] == str(ifc_file.id)


def test_get_materials_for_nonexistent_file_fails(client, auth_token):
    """Teste se a chamada GET para um ifc_file_id inexistente retorna 404 Not Found"""
    nonexistent_file_id = str(uuid.uuid4())
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get(f"/ifc-files/{nonexistent_file_id}/materials", headers=headers)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_update_material_success(client, auth_token, test_ifc_file_with_materials):
    """Teste a atualização de um material (ex: description, quantity, unit). Verifique se a resposta é 200 OK e os dados foram alterados"""
    material = test_ifc_file_with_materials["materials"][0]
    
    update_data = {
        "description": "Updated Concrete C30/35",
        "quantity": 200.0,
        "unit": "m³"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.put(f"/materials/{material.id}", json=update_data, headers=headers)
    
    assert response.status_code == 200
    response_data = response.json()
    
    assert response_data["description"] == "Updated Concrete C30/35"
    assert float(response_data["quantity"]) == 200.0
    assert response_data["unit"] == "m³"
    assert response_data["id"] == str(material.id)


def test_delete_material_success(client, auth_token, test_ifc_file_with_materials):
    """Teste a exclusão de um material. Verifique se a resposta é 204 No Content e se o material foi removido da lista"""
    ifc_file = test_ifc_file_with_materials["ifc_file"]
    material = test_ifc_file_with_materials["materials"][0]
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.delete(f"/materials/{material.id}", headers=headers)
    
    assert response.status_code == 204
    
    # Verificar se o material foi removido da lista
    response = client.get(f"/ifc-files/{ifc_file.id}/materials", headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    
    # Deve ter 2 materiais restantes (originalmente eram 3)
    assert len(response_data) == 2
    
    # Verificar se o material deletado não está na lista
    material_ids = [mat["id"] for mat in response_data]
    assert str(material.id) not in material_ids


def test_user_cannot_access_materials_from_another_company(client, db_session):
    """Crie dois usuários em empresas diferentes, processe um arquivo para o primeiro, e verifique se o segundo usuário recebe 404 Not Found ao tentar acessar/modificar os materiais do primeiro"""
    # Criar primeira empresa e usuário
    company1 = Company(
        name="Company 1",
        cnpj="11.111.111/0001-11",
        address="Address 1"
    )
    db_session.add(company1)
    db_session.commit()
    db_session.refresh(company1)
    
    user1 = User(
        email="user1@company1.com",
        hashed_password=hash_password("senha123"),
        full_name="User 1",
        company_id=company1.id
    )
    db_session.add(user1)
    db_session.commit()
    
    # Criar segunda empresa e usuário
    company2 = Company(
        name="Company 2",
        cnpj="22.222.222/0002-22",
        address="Address 2"
    )
    db_session.add(company2)
    db_session.commit()
    db_session.refresh(company2)
    
    user2 = User(
        email="user2@company2.com",
        hashed_password=hash_password("senha123"),
        full_name="User 2",
        company_id=company2.id
    )
    db_session.add(user2)
    db_session.commit()
    
    # Obter tokens de autenticação para ambos os usuários
    login_data1 = {"email": "user1@company1.com", "password": "senha123"}
    response1 = client.post("/auth/token", json=login_data1)
    assert response1.status_code == 200
    token1 = response1.json()["access_token"]
    
    login_data2 = {"email": "user2@company2.com", "password": "senha123"}
    response2 = client.post("/auth/token", json=login_data2)
    assert response2.status_code == 200
    token2 = response2.json()["access_token"]
    
    # Usuário 1 cria um projeto
    project_data = {"name": "Company 1 Project"}
    headers1 = {"Authorization": f"Bearer {token1}"}
    response = client.post("/projects", json=project_data, headers=headers1)
    assert response.status_code == 201
    project_id = response.json()["id"]
    
    # Criar arquivo IFC e materiais para a empresa 1
    ifc_file = IFCFile(
        original_filename="company1_file.ifc",
        file_path="ifc-files/company1-file.ifc",
        status="PROCESSED",
        project_id=uuid.UUID(project_id)
    )
    db_session.add(ifc_file)
    db_session.commit()
    db_session.refresh(ifc_file)
    
    material = Material(
        description="Private Material",
        quantity=100.0,
        unit="kg",
        ifc_file_id=ifc_file.id
    )
    db_session.add(material)
    db_session.commit()
    db_session.refresh(material)
    
    # Usuário 2 tenta acessar materiais do arquivo IFC da empresa 1
    headers2 = {"Authorization": f"Bearer {token2}"}
    
    # Teste GET materials - deve retornar 404
    response = client.get(f"/ifc-files/{ifc_file.id}/materials", headers=headers2)
    assert response.status_code == 404
    
    # Teste UPDATE material - deve retornar 404
    update_data = {"description": "Hacked Material", "quantity": 999.0, "unit": "kg"}
    response = client.put(f"/materials/{material.id}", json=update_data, headers=headers2)
    assert response.status_code == 404
    
    # Teste DELETE material - deve retornar 404
    response = client.delete(f"/materials/{material.id}", headers=headers2)
    assert response.status_code == 404
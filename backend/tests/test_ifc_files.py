import pytest
import uuid
from io import BytesIO
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


@pytest.fixture
def test_project(client, auth_token):
    """Fixture que cria um projeto de teste"""
    project_data = {
        "name": "Test Project for IFC",
        "address": "123 Test Street"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/projects", json=project_data, headers=headers)
    assert response.status_code == 201
    
    return response.json()


@pytest.fixture
def ifc_file_content():
    """Fixture que retorna o conteúdo de um arquivo IFC de teste válido"""
    # Conteúdo mínimo de um arquivo IFC válido
    content = """ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01T10:00:00',('Test User'),('Test Organization'),'IFC Test File','Test Application','Test Version');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('3nv1si8xb0QuRsOYjlGwGx',#2,'Test Project',$,$,$,$,$,#3);
#2=IFCOWNERHISTORY(#4,#5,$,.ADDED.,1577836800,$,$,1577836800);
#3=IFCUNITASSIGNMENT((#6));
#4=IFCPERSON($,'Test','User',$,$,$,$,$);
#5=IFCORGANIZATION($,'Test Organization',$,$,$);
#6=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
ENDSEC;
END-ISO-10303-21;
"""
    return content.encode('utf-8')


@pytest.fixture
def txt_file_content():
    """Fixture que retorna o conteúdo de um arquivo TXT para teste de tipo inválido"""
    return b"This is a text file, not an IFC file."


def test_upload_ifc_file_success(client, auth_token, test_project, ifc_file_content):
    """Teste o upload bem-sucedido do arquivo .ifc de teste"""
    project_id = test_project["id"]
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
    
    response = client.post(f"/projects/{project_id}/ifc-files", files=files, headers=headers)
    
    assert response.status_code == 202  # Accepted - processamento assíncrono enfileirado
    response_data = response.json()
    assert "id" in response_data
    assert response_data["original_filename"] == "test.ifc"
    assert response_data["status"] == "PENDING"
    assert response_data["project_id"] == project_id


def test_upload_invalid_file_type_fails(client, auth_token, test_project, txt_file_content):
    """Teste o upload de um arquivo com uma extensão inválida"""
    project_id = test_project["id"]
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    files = {"file": ("test.txt", BytesIO(txt_file_content), "text/plain")}
    
    response = client.post(f"/projects/{project_id}/ifc-files", files=files, headers=headers)
    
    assert response.status_code == 400  # Bad Request
    response_data = response.json()
    assert "detail" in response_data


def test_upload_to_nonexistent_project_fails(client, auth_token, ifc_file_content):
    """Teste a tentativa de fazer upload para um project_id que não existe"""
    # Usar um UUID aleatório inexistente
    nonexistent_project_id = str(uuid.uuid4())
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
    
    response = client.post(f"/projects/{nonexistent_project_id}/ifc-files", files=files, headers=headers)
    
    assert response.status_code == 404  # Not Found
    response_data = response.json()
    assert "detail" in response_data


def test_upload_unauthenticated_fails(client, test_project, ifc_file_content):
    """Teste a tentativa de upload sem um token de autenticação"""
    project_id = test_project["id"]
    
    files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
    
    response = client.post(f"/projects/{project_id}/ifc-files", files=files)
    
    # FastAPI/HTTPBearer pode retornar 401 ou 403 quando não há token
    assert response.status_code in [401, 403]
    response_data = response.json()
    assert "detail" in response_data


def test_upload_to_project_of_another_company_fails(client, db_session, ifc_file_content):
    """Teste upload de arquivo para projeto de outra empresa"""
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
    
    # Usuário 2 tenta fazer upload de arquivo IFC para o projeto da empresa 1
    headers2 = {"Authorization": f"Bearer {token2}"}
    files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
    response = client.post(f"/projects/{project_id}/ifc-files", files=files, headers=headers2)
    
    # Deve retornar 404 para não vazar informação sobre existência do projeto
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data
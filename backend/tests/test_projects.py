import pytest
import uuid
from datetime import date
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.project import Project
from app.db.models.rfq import RFQ
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


def test_get_projects_success(client, auth_token):
    """Teste para verificar a listagem bem-sucedida de projetos"""
    # Criar múltiplos projetos
    projects_data = [
        {"name": "Project 1", "address": "Address 1", "start_date": "2024-01-15"},
        {"name": "Project 2", "address": "Address 2", "start_date": "2024-02-15"},
        {"name": "Project 3", "start_date": "2024-03-15"}
    ]
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    created_projects = []
    
    # Criar os projetos
    for project_data in projects_data:
        response = client.post("/projects", json=project_data, headers=headers)
        assert response.status_code == 201
        created_projects.append(response.json())
    
    # Listar os projetos
    response = client.get("/projects", headers=headers)
    
    assert response.status_code == 200
    response_data = response.json()
    
    # Verificar se a resposta tem a nova estrutura
    assert isinstance(response_data, dict)
    assert "projects" in response_data
    # Verificar se contém o número correto de projetos
    assert len(response_data["projects"]) == len(projects_data)
    
    # Verificar se os projetos criados estão na lista
    project_names = [project["name"] for project in response_data["projects"]]
    for project_data in projects_data:
        assert project_data["name"] in project_names


def test_get_projects_isolates_by_company(client, db_session):
    """Teste para verificar se projetos são isolados por empresa"""
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
    
    # Criar projetos para ambas as empresas
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    
    # Projetos da empresa 1
    company1_projects = [
        {"name": "Company 1 Project 1"},
        {"name": "Company 1 Project 2"}
    ]
    
    for project_data in company1_projects:
        response = client.post("/projects", json=project_data, headers=headers1)
        assert response.status_code == 201
    
    # Projetos da empresa 2
    company2_projects = [
        {"name": "Company 2 Project 1"}
    ]
    
    for project_data in company2_projects:
        response = client.post("/projects", json=project_data, headers=headers2)
        assert response.status_code == 201
    
    # Verificar isolamento: usuário 1 deve ver apenas projetos da empresa 1
    response = client.get("/projects", headers=headers1)
    assert response.status_code == 200
    projects_user1 = response.json()
    
    assert "projects" in projects_user1
    assert len(projects_user1["projects"]) == len(company1_projects)
    project_names = [project["name"] for project in projects_user1["projects"]]
    for project_data in company1_projects:
        assert project_data["name"] in project_names
    
    # Verificar que não contém projetos da empresa 2
    for project_data in company2_projects:
        assert project_data["name"] not in project_names


def test_get_project_by_id_success(client, auth_token):
    """Teste para verificar a busca bem-sucedida de um projeto por ID"""
    # Criar um projeto
    project_data = {
        "name": "Test Project",
        "address": "123 Test Street",
        "start_date": "2024-01-15"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/projects", json=project_data, headers=headers)
    
    assert response.status_code == 201
    created_project = response.json()
    project_id = created_project["id"]
    
    # Buscar o projeto por ID
    response = client.get(f"/projects/{project_id}", headers=headers)
    
    assert response.status_code == 200
    retrieved_project = response.json()
    
    # Verificar se os dados correspondem
    assert retrieved_project["id"] == project_id
    assert retrieved_project["name"] == project_data["name"]
    assert retrieved_project["address"] == project_data["address"]
    assert retrieved_project["start_date"] == project_data["start_date"]


def test_get_project_by_id_not_found(client, auth_token):
    """Teste para verificar resposta 404 ao buscar projeto inexistente"""
    # Usar um UUID aleatório inexistente
    nonexistent_id = str(uuid.uuid4())
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get(f"/projects/{nonexistent_id}", headers=headers)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_get_project_by_id_unauthenticated_fails(client):
    """Teste para verificar falha na busca de projeto sem autenticação"""
    # Usar um UUID aleatório
    project_id = str(uuid.uuid4())
    
    response = client.get(f"/projects/{project_id}")
    
    # FastAPI/HTTPBearer pode retornar 401 ou 403 quando não há token
    assert response.status_code in [401, 403]
    response_data = response.json()
    assert "detail" in response_data


def test_update_project_success(client, auth_token):
    """Teste para verificar a atualização bem-sucedida de um projeto"""
    # Criar um projeto primeiro
    project_data = {
        "name": "Original Project",
        "address": "Original Address",
        "start_date": "2024-01-15"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/projects", json=project_data, headers=headers)
    
    assert response.status_code == 201
    created_project = response.json()
    project_id = created_project["id"]
    
    # Atualizar o projeto
    update_data = {
        "name": "Updated Project",
        "address": "Updated Address"
    }
    
    response = client.put(f"/projects/{project_id}", json=update_data, headers=headers)
    
    assert response.status_code == 200
    updated_project = response.json()
    
    # Verificar se os dados foram atualizados
    assert updated_project["id"] == project_id
    assert updated_project["name"] == update_data["name"]
    assert updated_project["address"] == update_data["address"]
    # start_date deve permanecer igual
    assert updated_project["start_date"] == project_data["start_date"]


def test_update_project_not_found(client, auth_token):
    """Teste para verificar resposta 404 ao tentar atualizar projeto inexistente"""
    # Usar um UUID aleatório inexistente
    nonexistent_id = str(uuid.uuid4())
    
    update_data = {
        "name": "Updated Project",
        "address": "Updated Address"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.put(f"/projects/{nonexistent_id}", json=update_data, headers=headers)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_update_project_wrong_company_fails(client, db_session):
    """Teste para verificar que usuário de uma empresa não consegue atualizar projeto de outra empresa"""
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
    
    # Usuário 2 tenta atualizar o projeto da empresa 1
    update_data = {"name": "Hacked Project"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    response = client.put(f"/projects/{project_id}", json=update_data, headers=headers2)
    
    # Deve retornar 404 para não vazar informação sobre existência do projeto
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_delete_project_success(client, auth_token):
    """Teste para verificar a exclusão bem-sucedida de um projeto"""
    # Criar um projeto primeiro
    project_data = {
        "name": "Project to Delete",
        "address": "Address to Delete",
        "start_date": "2024-01-15"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/projects", json=project_data, headers=headers)
    
    assert response.status_code == 201
    created_project = response.json()
    project_id = created_project["id"]
    
    # Deletar o projeto
    response = client.delete(f"/projects/{project_id}", headers=headers)
    
    assert response.status_code == 204
    
    # Confirmar que o projeto foi deletado fazendo uma requisição GET
    response = client.get(f"/projects/{project_id}", headers=headers)
    assert response.status_code == 404


def test_delete_project_not_found(client, auth_token):
    """Teste para verificar resposta 404 ao tentar deletar projeto inexistente"""
    # Usar um UUID aleatório inexistente
    nonexistent_id = str(uuid.uuid4())
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.delete(f"/projects/{nonexistent_id}", headers=headers)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_delete_project_wrong_company_fails(client, db_session):
    """Teste para verificar que usuário de uma empresa não consegue deletar projeto de outra empresa"""
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
    
    # Usuário 2 tenta deletar o projeto da empresa 1
    headers2 = {"Authorization": f"Bearer {token2}"}
    response = client.delete(f"/projects/{project_id}", headers=headers2)
    
    # Deve retornar 404 para não vazar informação sobre existência do projeto
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_get_projects_with_search_success(client, auth_token, db_session, create_test_user):
    """Teste para verificar busca por projetos com termo de pesquisa"""
    # Criar projetos de teste
    projects_data = [
        {"name": "Casa Silva", "address": "Rua das Flores 123"},
        {"name": "Apartamento Santos", "address": "Avenida Principal 456"},
        {"name": "Escritório", "address": "Rua Silva 789"}
    ]
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    created_projects = []
    
    # Criar os projetos
    for project_data in projects_data:
        response = client.post("/projects", json=project_data, headers=headers)
        assert response.status_code == 201
        created_projects.append(response.json())
    
    # Buscar por "Silva" (deve encontrar 2 projetos)
    response = client.get("/projects?search=Silva", headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    
    assert "projects" in response_data
    assert len(response_data["projects"]) == 2
    
    project_names = [project["name"] for project in response_data["projects"]]
    assert "Casa Silva" in project_names
    assert "Escritório" in project_names
    assert "Apartamento Santos" not in project_names


def test_get_projects_with_pagination_success(client, auth_token, db_session, create_test_user):
    """Teste para verificar paginação de projetos"""
    # Criar 15 projetos de teste
    projects_data = [{"name": f"Projeto {i}"} for i in range(1, 16)]
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Criar os projetos
    for project_data in projects_data:
        response = client.post("/projects", json=project_data, headers=headers)
        assert response.status_code == 201
    
    # Testar primeira página (limit=5)
    response = client.get("/projects?page=1&limit=5", headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    
    assert "projects" in response_data
    assert len(response_data["projects"]) == 5
    assert response_data["total_count"] == 15
    assert response_data["total_pages"] == 3
    assert response_data["current_page"] == 1
    assert response_data["limit"] == 5
    assert response_data["has_next"] is True
    assert response_data["has_previous"] is False
    
    # Testar segunda página
    response = client.get("/projects?page=2&limit=5", headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    
    assert len(response_data["projects"]) == 5
    assert response_data["current_page"] == 2
    assert response_data["has_next"] is True
    assert response_data["has_previous"] is True
    
    # Testar última página
    response = client.get("/projects?page=3&limit=5", headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    
    assert len(response_data["projects"]) == 5
    assert response_data["current_page"] == 3
    assert response_data["has_next"] is False
    assert response_data["has_previous"] is True


def test_get_projects_with_status_filter_success(client, auth_token, db_session, create_test_user):
    """Teste para verificar filtro por status de RFQ"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Criar projetos
    project1_data = {"name": "Projeto com RFQ aberto"}
    response = client.post("/projects", json=project1_data, headers=headers)
    assert response.status_code == 201
    project1 = response.json()
    
    project2_data = {"name": "Projeto com RFQ fechado"}
    response = client.post("/projects", json=project2_data, headers=headers)
    assert response.status_code == 201
    project2 = response.json()
    
    project3_data = {"name": "Projeto sem RFQ"}
    response = client.post("/projects", json=project3_data, headers=headers)
    assert response.status_code == 201
    project3 = response.json()
    
    # Criar RFQs no banco diretamente
    rfq1 = RFQ(
        status="OPEN",
        project_id=uuid.UUID(project1["id"])
    )
    db_session.add(rfq1)
    
    rfq2 = RFQ(
        status="CLOSED",
        project_id=uuid.UUID(project2["id"])
    )
    db_session.add(rfq2)
    
    db_session.commit()
    
    # Filtrar por status OPEN
    response = client.get("/projects?status=OPEN", headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    
    assert "projects" in response_data
    assert len(response_data["projects"]) == 1
    assert response_data["projects"][0]["name"] == "Projeto com RFQ aberto"
    
    # Filtrar por status CLOSED
    response = client.get("/projects?status=CLOSED", headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    
    assert len(response_data["projects"]) == 1
    assert response_data["projects"][0]["name"] == "Projeto com RFQ fechado"


def test_get_projects_summary_success(client, auth_token, db_session, create_test_user):
    """Teste para verificar endpoint de resumo de projetos"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Criar projetos
    projects_data = [
        {"name": "Projeto 1"},
        {"name": "Projeto 2"},
        {"name": "Projeto 3"}
    ]
    
    created_projects = []
    for project_data in projects_data:
        response = client.post("/projects", json=project_data, headers=headers)
        assert response.status_code == 201
        created_projects.append(response.json())
    
    # Criar RFQs com diferentes status
    rfq1 = RFQ(status="OPEN", project_id=uuid.UUID(created_projects[0]["id"]))
    rfq2 = RFQ(status="OPEN", project_id=uuid.UUID(created_projects[1]["id"]))
    rfq3 = RFQ(status="CLOSED", project_id=uuid.UUID(created_projects[2]["id"]))
    
    db_session.add_all([rfq1, rfq2, rfq3])
    db_session.commit()
    
    # Buscar resumo
    response = client.get("/projects/summary", headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    
    assert "total_projects" in response_data
    assert "active_rfqs" in response_data
    assert "completed_projects" in response_data
    
    assert response_data["total_projects"] == 3
    assert response_data["active_rfqs"] == 2
    assert response_data["completed_projects"] == 1


def test_get_projects_summary_isolates_by_company(client, db_session):
    """Teste para verificar isolamento por empresa no endpoint summary"""
    # Criar duas empresas
    company1 = Company(name="Company 1", cnpj="11.111.111/0001-11", address="Address 1")
    company2 = Company(name="Company 2", cnpj="22.222.222/0002-22", address="Address 2")
    
    db_session.add_all([company1, company2])
    db_session.commit()
    db_session.refresh(company1)
    db_session.refresh(company2)
    
    # Criar usuários para cada empresa
    user1 = User(
        email="user1@company1.com",
        hashed_password=hash_password("senha123"),
        full_name="User 1",
        company_id=company1.id
    )
    user2 = User(
        email="user2@company2.com",
        hashed_password=hash_password("senha123"),
        full_name="User 2",
        company_id=company2.id
    )
    
    db_session.add_all([user1, user2])
    db_session.commit()
    
    # Obter tokens
    login_data1 = {"email": "user1@company1.com", "password": "senha123"}
    response1 = client.post("/auth/token", json=login_data1)
    token1 = response1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}
    
    login_data2 = {"email": "user2@company2.com", "password": "senha123"}
    response2 = client.post("/auth/token", json=login_data2)
    token2 = response2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}
    
    # Criar projetos para empresa 1
    for i in range(2):
        project_data = {"name": f"Company 1 Project {i+1}"}
        response = client.post("/projects", json=project_data, headers=headers1)
        assert response.status_code == 201
        
        # Criar RFQ para o projeto
        project = response.json()
        rfq = RFQ(status="OPEN", project_id=uuid.UUID(project["id"]))
        db_session.add(rfq)
    
    # Criar projetos para empresa 2
    project_data = {"name": "Company 2 Project 1"}
    response = client.post("/projects", json=project_data, headers=headers2)
    assert response.status_code == 201
    
    project = response.json()
    rfq = RFQ(status="CLOSED", project_id=uuid.UUID(project["id"]))
    db_session.add(rfq)
    
    db_session.commit()
    
    # Verificar resumo da empresa 1
    response = client.get("/projects/summary", headers=headers1)
    assert response.status_code == 200
    summary1 = response.json()
    
    assert summary1["total_projects"] == 2
    assert summary1["active_rfqs"] == 2
    assert summary1["completed_projects"] == 0
    
    # Verificar resumo da empresa 2
    response = client.get("/projects/summary", headers=headers2)
    assert response.status_code == 200
    summary2 = response.json()
    
    assert summary2["total_projects"] == 1
    assert summary2["active_rfqs"] == 0
    assert summary2["completed_projects"] == 1
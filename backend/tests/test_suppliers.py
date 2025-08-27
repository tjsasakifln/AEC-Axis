import pytest
import uuid
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


def test_create_supplier_success(client, auth_token):
    """Teste para verificar a criação bem-sucedida de um fornecedor com dados completos"""
    supplier_data = {
        "name": "Fornecedor Teste LTDA",
        "cnpj": "98.765.432/0001-10",
        "email": "contato@fornecedor.com"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/suppliers", json=supplier_data, headers=headers)
    
    assert response.status_code == 201
    response_data = response.json()
    
    assert response_data["name"] == supplier_data["name"]
    assert response_data["cnpj"] == supplier_data["cnpj"]
    assert response_data["email"] == supplier_data["email"]
    assert "id" in response_data
    assert "company_id" in response_data
    assert "created_at" in response_data


def test_create_supplier_missing_name_fails(client, auth_token):
    """Teste para verificar falha na criação de fornecedor sem campo name"""
    supplier_data = {
        "cnpj": "98.765.432/0001-10",
        "email": "contato@fornecedor.com"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/suppliers", json=supplier_data, headers=headers)
    
    assert response.status_code == 422
    response_data = response.json()
    assert "detail" in response_data


def test_create_supplier_duplicate_cnpj_fails(client, auth_token):
    """Teste para verificar falha na criação de fornecedor com CNPJ duplicado para a mesma empresa"""
    # Criar primeiro fornecedor
    supplier_data_1 = {
        "name": "Primeiro Fornecedor",
        "cnpj": "98.765.432/0001-10",
        "email": "primeiro@fornecedor.com"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/suppliers", json=supplier_data_1, headers=headers)
    assert response.status_code == 201
    
    # Tentar criar segundo fornecedor com mesmo CNPJ
    supplier_data_2 = {
        "name": "Segundo Fornecedor",
        "cnpj": "98.765.432/0001-10",  # Mesmo CNPJ
        "email": "segundo@fornecedor.com"
    }
    
    response = client.post("/suppliers", json=supplier_data_2, headers=headers)
    
    assert response.status_code == 400
    response_data = response.json()
    assert "detail" in response_data


def test_create_supplier_unauthenticated_fails(client):
    """Teste para verificar falha na criação de fornecedor sem autenticação"""
    supplier_data = {
        "name": "Fornecedor Não Autorizado",
        "cnpj": "98.765.432/0001-10",
        "email": "nao-autorizado@fornecedor.com"
    }
    
    response = client.post("/suppliers", json=supplier_data)
    
    # FastAPI/HTTPBearer pode retornar 401 ou 403 quando não há token
    assert response.status_code in [401, 403]
    response_data = response.json()
    assert "detail" in response_data


def test_get_suppliers_success(client, auth_token):
    """Teste para verificar a listagem bem-sucedida de fornecedores"""
    # Criar múltiplos fornecedores
    suppliers_data = [
        {"name": "Fornecedor 1", "cnpj": "11.111.111/0001-11", "email": "fornecedor1@test.com"},
        {"name": "Fornecedor 2", "cnpj": "22.222.222/0001-22", "email": "fornecedor2@test.com"},
        {"name": "Fornecedor 3", "cnpj": "33.333.333/0001-33", "email": "fornecedor3@test.com"}
    ]
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    created_suppliers = []
    
    # Criar os fornecedores
    for supplier_data in suppliers_data:
        response = client.post("/suppliers", json=supplier_data, headers=headers)
        assert response.status_code == 201
        created_suppliers.append(response.json())
    
    # Listar os fornecedores
    response = client.get("/suppliers", headers=headers)
    
    assert response.status_code == 200
    response_data = response.json()
    
    # Verificar se a resposta é uma lista
    assert isinstance(response_data, list)
    # Verificar se contém o número correto de fornecedores
    assert len(response_data) == len(suppliers_data)
    
    # Verificar se os fornecedores criados estão na lista
    supplier_names = [supplier["name"] for supplier in response_data]
    for supplier_data in suppliers_data:
        assert supplier_data["name"] in supplier_names


def test_get_suppliers_isolates_by_company(client, db_session):
    """Teste para verificar se fornecedores são isolados por empresa"""
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
    
    # Criar fornecedores para ambas as empresas
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    
    # Fornecedores da empresa 1
    company1_suppliers = [
        {"name": "Company 1 Supplier 1", "cnpj": "11.111.111/0001-11", "email": "supplier1@company1.com"},
        {"name": "Company 1 Supplier 2", "cnpj": "11.222.333/0001-44", "email": "supplier2@company1.com"}
    ]
    
    for supplier_data in company1_suppliers:
        response = client.post("/suppliers", json=supplier_data, headers=headers1)
        assert response.status_code == 201
    
    # Fornecedores da empresa 2
    company2_suppliers = [
        {"name": "Company 2 Supplier 1", "cnpj": "22.111.111/0001-11", "email": "supplier1@company2.com"}
    ]
    
    for supplier_data in company2_suppliers:
        response = client.post("/suppliers", json=supplier_data, headers=headers2)
        assert response.status_code == 201
    
    # Verificar isolamento: usuário 1 deve ver apenas fornecedores da empresa 1
    response = client.get("/suppliers", headers=headers1)
    assert response.status_code == 200
    suppliers_user1 = response.json()
    
    assert len(suppliers_user1) == len(company1_suppliers)
    supplier_names = [supplier["name"] for supplier in suppliers_user1]
    for supplier_data in company1_suppliers:
        assert supplier_data["name"] in supplier_names
    
    # Verificar que não contém fornecedores da empresa 2
    for supplier_data in company2_suppliers:
        assert supplier_data["name"] not in supplier_names


def test_get_supplier_by_id_success(client, auth_token):
    """Teste para verificar a busca bem-sucedida de um fornecedor por ID"""
    # Criar um fornecedor
    supplier_data = {
        "name": "Fornecedor Teste ID",
        "cnpj": "99.888.777/0001-66",
        "email": "teste-id@fornecedor.com"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/suppliers", json=supplier_data, headers=headers)
    
    assert response.status_code == 201
    created_supplier = response.json()
    supplier_id = created_supplier["id"]
    
    # Buscar o fornecedor por ID
    response = client.get(f"/suppliers/{supplier_id}", headers=headers)
    
    assert response.status_code == 200
    retrieved_supplier = response.json()
    
    # Verificar se os dados correspondem
    assert retrieved_supplier["id"] == supplier_id
    assert retrieved_supplier["name"] == supplier_data["name"]
    assert retrieved_supplier["cnpj"] == supplier_data["cnpj"]
    assert retrieved_supplier["email"] == supplier_data["email"]


def test_get_supplier_by_id_not_found(client, auth_token):
    """Teste para verificar resposta 404 ao buscar fornecedor inexistente"""
    # Usar um UUID aleatório inexistente
    nonexistent_id = str(uuid.uuid4())
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get(f"/suppliers/{nonexistent_id}", headers=headers)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_get_supplier_unauthenticated_fails(client):
    """Teste para verificar falha na busca de fornecedor sem autenticação"""
    # Usar um UUID aleatório
    supplier_id = str(uuid.uuid4())
    
    response = client.get(f"/suppliers/{supplier_id}")
    
    # FastAPI/HTTPBearer pode retornar 401 ou 403 quando não há token
    assert response.status_code in [401, 403]
    response_data = response.json()
    assert "detail" in response_data


def test_update_supplier_success(client, auth_token):
    """Teste para verificar a atualização bem-sucedida de um fornecedor"""
    # Criar um fornecedor
    supplier_data = {
        "name": "Fornecedor Original",
        "cnpj": "11.222.333/0001-44",
        "email": "original@fornecedor.com"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/suppliers", json=supplier_data, headers=headers)
    
    assert response.status_code == 201
    created_supplier = response.json()
    supplier_id = created_supplier["id"]
    
    # Atualizar o fornecedor
    updated_data = {
        "name": "Fornecedor Atualizado",
        "email": "atualizado@fornecedor.com"
    }
    
    response = client.put(f"/suppliers/{supplier_id}", json=updated_data, headers=headers)
    
    assert response.status_code == 200
    updated_supplier = response.json()
    
    # Verificar se os dados foram atualizados
    assert updated_supplier["id"] == supplier_id
    assert updated_supplier["name"] == updated_data["name"]
    assert updated_supplier["email"] == updated_data["email"]
    assert updated_supplier["cnpj"] == supplier_data["cnpj"]  # CNPJ deve permanecer o mesmo


def test_update_supplier_not_found(client, auth_token):
    """Teste para verificar resposta 404 ao tentar atualizar fornecedor inexistente"""
    # Usar um UUID aleatório inexistente
    nonexistent_id = str(uuid.uuid4())
    
    updated_data = {
        "name": "Fornecedor Inexistente",
        "email": "inexistente@fornecedor.com"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.put(f"/suppliers/{nonexistent_id}", json=updated_data, headers=headers)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_update_supplier_wrong_company_fails(client, db_session):
    """Teste para verificar falha ao tentar atualizar fornecedor de outra empresa"""
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
    
    # Criar fornecedor com usuário da empresa 1
    supplier_data = {
        "name": "Fornecedor Company 1",
        "cnpj": "11.333.444/0001-55",
        "email": "fornecedor@company1.com"
    }
    
    headers1 = {"Authorization": f"Bearer {token1}"}
    response = client.post("/suppliers", json=supplier_data, headers=headers1)
    assert response.status_code == 201
    supplier = response.json()
    supplier_id = supplier["id"]
    
    # Tentar atualizar o fornecedor usando token da empresa 2
    updated_data = {
        "name": "Fornecedor Hackeado",
        "email": "hackeado@company2.com"
    }
    
    headers2 = {"Authorization": f"Bearer {token2}"}
    response = client.put(f"/suppliers/{supplier_id}", json=updated_data, headers=headers2)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_delete_supplier_success(client, auth_token):
    """Teste para verificar a exclusão bem-sucedida de um fornecedor"""
    # Criar um fornecedor
    supplier_data = {
        "name": "Fornecedor Para Deletar",
        "cnpj": "99.888.777/0001-66",
        "email": "deletar@fornecedor.com"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/suppliers", json=supplier_data, headers=headers)
    
    assert response.status_code == 201
    created_supplier = response.json()
    supplier_id = created_supplier["id"]
    
    # Deletar o fornecedor
    response = client.delete(f"/suppliers/{supplier_id}", headers=headers)
    
    assert response.status_code == 204
    
    # Verificar se o fornecedor foi realmente deletado
    response = client.get(f"/suppliers/{supplier_id}", headers=headers)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_delete_supplier_not_found(client, auth_token):
    """Teste para verificar resposta 404 ao tentar deletar fornecedor inexistente"""
    # Usar um UUID aleatório inexistente
    nonexistent_id = str(uuid.uuid4())
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.delete(f"/suppliers/{nonexistent_id}", headers=headers)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_delete_supplier_wrong_company_fails(client, db_session):
    """Teste para verificar falha ao tentar deletar fornecedor de outra empresa"""
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
    
    # Criar fornecedor com usuário da empresa 1
    supplier_data = {
        "name": "Fornecedor Company 1",
        "cnpj": "11.333.444/0001-55",
        "email": "fornecedor@company1.com"
    }
    
    headers1 = {"Authorization": f"Bearer {token1}"}
    response = client.post("/suppliers", json=supplier_data, headers=headers1)
    assert response.status_code == 201
    supplier = response.json()
    supplier_id = supplier["id"]
    
    # Tentar deletar o fornecedor usando token da empresa 2
    headers2 = {"Authorization": f"Bearer {token2}"}
    response = client.delete(f"/suppliers/{supplier_id}", headers=headers2)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data
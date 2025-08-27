import pytest
import uuid
import time
from unittest.mock import patch
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.project import Project
from app.db.models.ifc_file import IFCFile
from app.db.models.material import Material
from app.db.models.supplier import Supplier
from app.db.models.rfq import RFQ, RFQItem
from app.db.models.quote import Quote, QuoteItem
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
def test_rfq_with_items(db_session, create_test_user):
    """Fixture que cria um RFQ com itens para testes de quotation"""
    # Criar projeto
    project = Project(
        name="Test Project",
        address="123 Test Street",
        company_id=create_test_user.company_id
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    # Criar arquivo IFC
    ifc_file = IFCFile(
        original_filename="test.ifc",
        file_path="ifc-files/test.ifc",
        status="PROCESSED",
        project_id=project.id
    )
    db_session.add(ifc_file)
    db_session.commit()
    db_session.refresh(ifc_file)
    
    # Criar materiais
    materials_data = [
        {"description": "Concrete C25/30", "quantity": 150.5, "unit": "m³"},
        {"description": "Steel Rebar Ø12mm", "quantity": 2500.0, "unit": "kg"}
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
    
    # Criar fornecedor
    supplier = Supplier(
        name="Test Supplier",
        cnpj="11.111.111/0001-11",
        email="supplier@example.com",
        company_id=create_test_user.company_id
    )
    db_session.add(supplier)
    db_session.commit()
    db_session.refresh(supplier)
    
    # Criar RFQ
    rfq = RFQ(
        status="OPEN",
        project_id=project.id
    )
    db_session.add(rfq)
    db_session.commit()
    db_session.refresh(rfq)
    
    # Criar RFQ items
    rfq_items = []
    for material in materials:
        rfq_item = RFQItem(
            rfq_id=rfq.id,
            material_id=material.id
        )
        db_session.add(rfq_item)
        rfq_items.append(rfq_item)
    
    db_session.commit()
    
    return {
        "rfq": rfq,
        "rfq_items": rfq_items,
        "supplier": supplier,
        "materials": materials,
        "project": project
    }


@pytest.fixture
def valid_quote_token(test_rfq_with_items):
    """Fixture que cria um token JWT válido para submissão de cotação"""
    SECRET_KEY = "your-secret-key-here"
    
    # Criar payload do token
    payload = {
        "rfq_id": str(test_rfq_with_items["rfq"].id),
        "supplier_id": str(test_rfq_with_items["supplier"].id),
        "type": "supplier_quote",
        "jti": str(uuid.uuid4()),  # Token único
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token


@pytest.fixture
def expired_quote_token(test_rfq_with_items):
    """Fixture que cria um token JWT expirado"""
    SECRET_KEY = "your-secret-key-here"
    
    # Criar payload do token expirado
    payload = {
        "rfq_id": str(test_rfq_with_items["rfq"].id),
        "supplier_id": str(test_rfq_with_items["supplier"].id),
        "type": "supplier_quote",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) - timedelta(days=1)  # Expirado há 1 dia
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token


@pytest.fixture
def invalid_signature_token(test_rfq_with_items):
    """Fixture que cria um token JWT com assinatura inválida"""
    WRONG_SECRET_KEY = "wrong-secret-key"
    
    payload = {
        "rfq_id": str(test_rfq_with_items["rfq"].id),
        "supplier_id": str(test_rfq_with_items["supplier"].id),
        "type": "supplier_quote",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    
    token = jwt.encode(payload, WRONG_SECRET_KEY, algorithm="HS256")
    return token


def test_submit_quote_success(client, db_session, test_rfq_with_items, valid_quote_token):
    """
    Teste uma submissão bem-sucedida com um token JWT válido.
    Verifique se a resposta é 200 OK e se os registros Quote e QuoteItem 
    foram criados corretamente no banco de dados, incluindo o jti do token.
    """
    # Dados da cotação
    quote_data = {
        "items": [
            {
                "rfq_item_id": str(test_rfq_with_items["rfq_items"][0].id),
                "price": 150.00,
                "lead_time_days": 15
            },
            {
                "rfq_item_id": str(test_rfq_with_items["rfq_items"][1].id),
                "price": 2.50,
                "lead_time_days": 10
            }
        ]
    }
    
    # Fazer a requisição POST
    response = client.post(f"/quotes/{valid_quote_token}", json=quote_data)
    
    # Verificar se a resposta é 200 OK
    assert response.status_code == 200
    response_data = response.json()
    
    # Verificar se os dados básicos da cotação estão corretos
    assert "id" in response_data
    assert "submitted_at" in response_data
    assert response_data["rfq_id"] == str(test_rfq_with_items["rfq"].id)
    assert response_data["supplier_id"] == str(test_rfq_with_items["supplier"].id)
    
    # Verificar se o registro Quote foi criado no banco de dados
    quote_id = uuid.UUID(response_data["id"])
    quote_from_db = db_session.query(Quote).filter(Quote.id == quote_id).first()
    assert quote_from_db is not None
    assert quote_from_db.rfq_id == test_rfq_with_items["rfq"].id
    assert quote_from_db.supplier_id == test_rfq_with_items["supplier"].id
    
    # Verificar se o jti do token foi armazenado corretamente
    SECRET_KEY = "your-secret-key-here"
    decoded_token = jwt.decode(valid_quote_token, SECRET_KEY, algorithms=["HS256"])
    assert quote_from_db.access_token_jti == decoded_token["jti"]
    
    # Verificar se os QuoteItems foram criados corretamente
    quote_items_from_db = db_session.query(QuoteItem).filter(QuoteItem.quote_id == quote_id).all()
    assert len(quote_items_from_db) == 2
    
    # Verificar os dados dos itens
    items_by_rfq_item_id = {str(item.rfq_item_id): item for item in quote_items_from_db}
    
    assert str(test_rfq_with_items["rfq_items"][0].id) in items_by_rfq_item_id
    assert str(test_rfq_with_items["rfq_items"][1].id) in items_by_rfq_item_id
    
    item1 = items_by_rfq_item_id[str(test_rfq_with_items["rfq_items"][0].id)]
    assert float(item1.price) == 150.00
    assert item1.lead_time_days == 15
    
    item2 = items_by_rfq_item_id[str(test_rfq_with_items["rfq_items"][1].id)]
    assert float(item2.price) == 2.50
    assert item2.lead_time_days == 10


def test_submit_quote_with_expired_token_fails(client, test_rfq_with_items, expired_quote_token):
    """
    Teste uma submissão com um token JWT expirado.
    Verifique se a resposta é 401 Unauthorized.
    """
    quote_data = {
        "items": [
            {
                "rfq_item_id": str(test_rfq_with_items["rfq_items"][0].id),
                "price": 150.00,
                "lead_time_days": 15
            }
        ]
    }
    
    # Fazer a requisição POST
    response = client.post(f"/quotes/{expired_quote_token}", json=quote_data)
    
    # Verificar se a resposta é 401 Unauthorized
    assert response.status_code == 401
    response_data = response.json()
    assert "detail" in response_data


def test_submit_quote_with_invalid_signature_fails(client, test_rfq_with_items, invalid_signature_token):
    """
    Teste uma submissão com um token adulterado.
    Verifique se a resposta é 401 Unauthorized.
    """
    quote_data = {
        "items": [
            {
                "rfq_item_id": str(test_rfq_with_items["rfq_items"][0].id),
                "price": 150.00,
                "lead_time_days": 15
            }
        ]
    }
    
    # Fazer a requisição POST
    response = client.post(f"/quotes/{invalid_signature_token}", json=quote_data)
    
    # Verificar se a resposta é 401 Unauthorized
    assert response.status_code == 401
    response_data = response.json()
    assert "detail" in response_data


def test_submit_quote_cannot_be_used_twice_fails(client, db_session, test_rfq_with_items, valid_quote_token):
    """
    Teste a submissão de uma cotação com sucesso e, em seguida, tente submeter 
    novamente usando o mesmo token. Verifique se a segunda tentativa falha com 
    403 Forbidden, confirmando a lógica de uso único do jti.
    """
    quote_data = {
        "items": [
            {
                "rfq_item_id": str(test_rfq_with_items["rfq_items"][0].id),
                "price": 150.00,
                "lead_time_days": 15
            }
        ]
    }
    
    # Primeira submissão - deve ter sucesso
    response1 = client.post(f"/quotes/{valid_quote_token}", json=quote_data)
    assert response1.status_code == 200
    
    # Segunda submissão com o mesmo token - deve falhar
    quote_data_2 = {
        "items": [
            {
                "rfq_item_id": str(test_rfq_with_items["rfq_items"][1].id),
                "price": 2.50,
                "lead_time_days": 10
            }
        ]
    }
    
    response2 = client.post(f"/quotes/{valid_quote_token}", json=quote_data_2)
    
    # Verificar se a segunda tentativa falha com 403 Forbidden
    assert response2.status_code == 403
    response_data = response2.json()
    assert "detail" in response_data
    
    # Verificar que apenas uma cotação foi criada no banco de dados
    SECRET_KEY = "your-secret-key-here"
    decoded_token = jwt.decode(valid_quote_token, SECRET_KEY, algorithms=["HS256"])
    quotes_with_jti = db_session.query(Quote).filter(
        Quote.access_token_jti == decoded_token["jti"]
    ).all()
    assert len(quotes_with_jti) == 1


def test_get_quote_details_success(client, db_session, test_rfq_with_items, valid_quote_token):
    """
    Teste a visualização bem-sucedida dos detalhes do RFQ usando um token JWT válido.
    Verifique se a resposta é 200 OK e se o corpo da resposta contém os detalhes 
    corretos do RFQ (nome do projeto e lista de materiais solicitados).
    """
    # Fazer a requisição GET
    response = client.get(f"/quotes/{valid_quote_token}")
    
    # Verificar se a resposta é 200 OK
    assert response.status_code == 200
    response_data = response.json()
    
    # Verificar se os dados básicos do RFQ estão corretos
    assert "rfq_id" in response_data
    assert "project" in response_data
    assert "materials" in response_data
    
    # Verificar dados do projeto
    project_data = response_data["project"]
    assert project_data["name"] == "Test Project"
    assert project_data["address"] == "123 Test Street"
    
    # Verificar dados dos materiais
    materials_data = response_data["materials"]
    assert len(materials_data) == 2
    
    # Verificar material 1
    material1 = next(m for m in materials_data if m["description"] == "Concrete C25/30")
    assert float(material1["quantity"]) == 150.5
    assert material1["unit"] == "m³"
    assert "rfq_item_id" in material1
    
    # Verificar material 2
    material2 = next(m for m in materials_data if m["description"] == "Steel Rebar Ø12mm")
    assert float(material2["quantity"]) == 2500.0
    assert material2["unit"] == "kg"
    assert "rfq_item_id" in material2


def test_get_quote_details_with_invalid_token_fails(client, test_rfq_with_items):
    """
    Teste a visualização com um token JWT inválido ou expirado.
    Verifique se a resposta é 401 Unauthorized.
    """
    # Testar com token inválido
    invalid_token = "invalid_token_here"
    response = client.get(f"/quotes/{invalid_token}")
    
    # Verificar se a resposta é 401 Unauthorized
    assert response.status_code == 401
    response_data = response.json()
    assert "detail" in response_data


def test_get_quote_details_with_expired_token_fails(client, test_rfq_with_items, expired_quote_token):
    """
    Teste a visualização com um token JWT expirado.
    Verifique se a resposta é 401 Unauthorized.
    """
    # Fazer a requisição GET com token expirado
    response = client.get(f"/quotes/{expired_quote_token}")
    
    # Verificar se a resposta é 401 Unauthorized
    assert response.status_code == 401
    response_data = response.json()
    assert "detail" in response_data


def test_get_quote_details_for_already_submitted_quote_fails(client, db_session, test_rfq_with_items, valid_quote_token):
    """
    Teste que simula uma submissão de cotação bem-sucedida e, em seguida, 
    tenta usar o mesmo token para fazer uma chamada GET. Verifique se a resposta 
    é 403 Forbidden, pois o link já foi utilizado.
    """
    # Primeiro, submeter uma cotação com sucesso
    quote_data = {
        "items": [
            {
                "rfq_item_id": str(test_rfq_with_items["rfq_items"][0].id),
                "price": 150.00,
                "lead_time_days": 15
            }
        ]
    }
    
    # Fazer a submissão da cotação
    submit_response = client.post(f"/quotes/{valid_quote_token}", json=quote_data)
    assert submit_response.status_code == 200
    
    # Agora tentar visualizar os detalhes com o mesmo token (já usado)
    get_response = client.get(f"/quotes/{valid_quote_token}")
    
    # Verificar se a resposta é 403 Forbidden
    assert get_response.status_code == 403
    response_data = get_response.json()
    assert "detail" in response_data
import pytest
import uuid
from unittest.mock import patch, AsyncMock
from jose import jwt
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.project import Project
from app.db.models.ifc_file import IFCFile
from app.db.models.material import Material
from app.db.models.supplier import Supplier
from app.db.models.rfq import RFQ, RFQItem
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
        "name": "Test Project for RFQ",
        "address": "123 Test Street"
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/projects", json=project_data, headers=headers)
    assert response.status_code == 201
    
    return response.json()


@pytest.fixture
def test_materials_and_suppliers(db_session, test_project, create_test_user):
    """Fixture que cria materiais e fornecedores para testes de RFQ"""
    # Criar arquivo IFC
    ifc_file = IFCFile(
        original_filename="test_rfq.ifc",
        file_path="ifc-files/test-rfq.ifc",
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
    
    # Criar fornecedores
    suppliers_data = [
        {"name": "Supplier A", "cnpj": "11.111.111/0001-11", "email": "supplier.a@example.com"},
        {"name": "Supplier B", "cnpj": "22.222.222/0001-22", "email": "supplier.b@example.com"},
        {"name": "Supplier C", "cnpj": "33.333.333/0001-33", "email": "supplier.c@example.com"}
    ]
    
    suppliers = []
    for sup_data in suppliers_data:
        supplier = Supplier(
            name=sup_data["name"],
            cnpj=sup_data["cnpj"],
            email=sup_data["email"],
            company_id=create_test_user.company_id
        )
        db_session.add(supplier)
        suppliers.append(supplier)
    
    db_session.commit()
    
    return {
        "ifc_file": ifc_file,
        "materials": materials,
        "suppliers": suppliers
    }


@patch('app.services.email_service.send_rfq_emails_batch', new_callable=AsyncMock)
def test_create_rfq_success(mock_send_emails, client, auth_token, test_materials_and_suppliers, test_project, db_session):
    """
    Teste que cria um RFQ com múltiplos materiais e fornecedores.
    
    Preparar o cenário: criar um projeto, um arquivo IFC, múltiplos materiais 
    associados a ele, e múltiplos fornecedores.
    Simular uma chamada POST para um novo endpoint /rfqs.
    Verificar se a resposta é 201 Created.
    Verificar se um novo registro foi criado na tabela rfqs.
    Verificar se o número correto de registros foi criado na tabela rfq_items.
    """
    materials = test_materials_and_suppliers["materials"]
    suppliers = test_materials_and_suppliers["suppliers"]
    
    # Selecionar alguns materiais para o RFQ
    selected_material_ids = [str(materials[0].id), str(materials[1].id)]
    selected_supplier_ids = [str(suppliers[0].id), str(suppliers[1].id)]
    
    rfq_data = {
        "project_id": test_project["id"],
        "material_ids": selected_material_ids,
        "supplier_ids": selected_supplier_ids
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/rfqs", json=rfq_data, headers=headers)
    
    # Verificar se a resposta é 201 Created
    assert response.status_code == 201
    response_data = response.json()
    
    # Verificar se os dados básicos do RFQ estão corretos
    assert "id" in response_data
    assert response_data["project_id"] == test_project["id"]
    assert response_data["status"] == "OPEN"
    assert "created_at" in response_data
    
    # Verificar se um novo registro foi criado na tabela rfqs
    rfq_id = uuid.UUID(response_data["id"])
    
    rfq_from_db = db_session.query(RFQ).filter(RFQ.id == rfq_id).first()
    assert rfq_from_db is not None
    assert rfq_from_db.project_id == uuid.UUID(test_project["id"])
    assert rfq_from_db.status == "OPEN"
    
    # Verificar se o número correto de registros foi criado na tabela rfq_items
    rfq_items_from_db = db_session.query(RFQItem).filter(RFQItem.rfq_id == rfq_id).all()
    assert len(rfq_items_from_db) == 2  # 2 materiais selecionados
    
    # Verificar se os IDs dos materiais estão corretos
    material_ids_from_db = [str(item.material_id) for item in rfq_items_from_db]
    assert set(material_ids_from_db) == set(selected_material_ids)
    
    # Verificar se a função de envio de e-mail foi chamada
    mock_send_emails.assert_called_once()
    
    # Verificar os dados do e-mail enviado
    call_args = mock_send_emails.call_args[0][0]  # Primeiro argumento da chamada
    assert len(call_args) == 2  # 2 fornecedores selecionados
    
    # Verificar dados dos e-mails para cada fornecedor
    supplier_emails = [suppliers[0].email, suppliers[1].email]
    supplier_names = [suppliers[0].name, suppliers[1].name]
    
    sent_emails = [email_data["supplier_email"] for email_data in call_args]
    sent_names = [email_data["supplier_name"] for email_data in call_args]
    
    assert set(sent_emails) == set(supplier_emails)
    assert set(sent_names) == set(supplier_names)
    
    # Verificar se todos os e-mails contêm links JWT válidos
    for email_data in call_args:
        assert "quote_link" in email_data
        quote_token = email_data["quote_link"]
        
        # Verificar se é um JWT válido
        try:
            decoded_token = jwt.decode(quote_token, "your-secret-key-here", algorithms=["HS256"])
            assert "rfq_id" in decoded_token
            assert "supplier_id" in decoded_token
            assert "jti" in decoded_token
            assert "type" in decoded_token
            assert decoded_token["type"] == "supplier_quote"
            assert decoded_token["rfq_id"] == str(rfq_id)
        except Exception as e:
            pytest.fail(f"Invalid JWT token: {e}")
        
        # Verificar se o projeto está correto
        assert email_data["project_name"] == test_project["name"]
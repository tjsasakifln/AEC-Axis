"""
Integration Tests for Refactored IFC Service - AEC Axis

Integration tests for the complete IFC upload workflow with the new async architecture.
This file contains updated tests that work with the refactored service.
"""

import pytest
import uuid
import os
import asyncio
from io import BytesIO
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
from app.db.models.user import User
from app.db.models.company import Company
from app.security import hash_password
from app.services.ifc_service import get_ifc_service, reset_ifc_service
from app.services.ifc.factories import IFCServiceFactory
from app.services.ifc.processing.mock_processor import MockIFCProcessor, MockBehavior
from app.services.ifc.storage.local_storage import LocalIFCStorage
from app.services.ifc.notification.sqs_notifier import SQSNotifier


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


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment for each test"""
    # Set environment to testing
    with patch.dict(os.environ, {'ENVIRONMENT': 'testing'}):
        # Reset service before each test
        reset_ifc_service()
        yield
        # Cleanup after each test
        reset_ifc_service()


@pytest.fixture
def mock_storage_and_notifier():
    """Mock storage and notification for testing"""
    mock_storage = AsyncMock(spec=LocalIFCStorage)
    mock_notifier = AsyncMock(spec=SQSNotifier)
    
    # Configure upload result
    mock_storage.upload_file.return_value = AsyncMock(
        storage_url="mock://storage/test.ifc",
        object_key="test-key",
        metadata={"test": "metadata"},
        file_size=1024
    )
    
    return mock_storage, mock_notifier


def test_upload_ifc_file_success_with_new_architecture(client, auth_token, test_project, ifc_file_content, mock_storage_and_notifier):
    """Test successful IFC file upload with new async architecture"""
    mock_storage, mock_notifier = mock_storage_and_notifier
    
    # Mock the factory to return our mocked components
    mock_processor = MockIFCProcessor(behavior=MockBehavior.SUCCESS)
    
    with patch.object(IFCServiceFactory, 'create_service_components') as mock_factory:
        mock_factory.return_value = {
            'storage': mock_storage,
            'processor': mock_processor,
            'notifier': mock_notifier,
            'config': MagicMock()
        }
        
        project_id = test_project["id"]
        headers = {"Authorization": f"Bearer {auth_token}"}
        files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
        
        response = client.post(f"/projects/{project_id}/ifc-files", files=files, headers=headers)
        
        # Verify response
        assert response.status_code == 202
        response_data = response.json()
        assert "id" in response_data
        assert response_data["original_filename"] == "test.ifc"
        assert response_data["status"] == "PENDING"
        assert response_data["project_id"] == project_id
        
        # Verify storage was called
        mock_storage.upload_file.assert_called_once()
        call_args = mock_storage.upload_file.call_args
        assert len(call_args[1]['content']) == len(ifc_file_content)
        assert call_args[1]['key'].startswith("ifc-files/")
        assert call_args[1]['key'].endswith(".ifc")
        
        # Verify notification was called
        mock_notifier.notify_processing_queued.assert_called_once()


def test_upload_invalid_file_type_fails(client, auth_token, test_project, txt_file_content):
    """Test upload of invalid file type still fails with new architecture"""
    project_id = test_project["id"]
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    files = {"file": ("test.txt", BytesIO(txt_file_content), "text/plain")}
    
    response = client.post(f"/projects/{project_id}/ifc-files", files=files, headers=headers)
    
    assert response.status_code == 400
    response_data = response.json()
    assert "detail" in response_data
    assert "IFC files are allowed" in response_data["detail"]


def test_upload_to_nonexistent_project_fails(client, auth_token, ifc_file_content):
    """Test upload to non-existent project still fails"""
    nonexistent_project_id = str(uuid.uuid4())
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
    
    response = client.post(f"/projects/{nonexistent_project_id}/ifc-files", files=files, headers=headers)
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data


def test_upload_unauthenticated_fails(client, test_project, ifc_file_content):
    """Test upload without authentication still fails"""
    project_id = test_project["id"]
    files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
    
    response = client.post(f"/projects/{project_id}/ifc-files", files=files)
    
    assert response.status_code in [401, 403]
    response_data = response.json()
    assert "detail" in response_data


def test_storage_error_handling(client, auth_token, test_project, ifc_file_content, mock_storage_and_notifier):
    """Test handling of storage errors"""
    mock_storage, mock_notifier = mock_storage_and_notifier
    
    # Configure storage to fail
    from app.services.ifc.storage.base import IFCStorageError
    mock_storage.upload_file.side_effect = IFCStorageError("Storage service unavailable")
    
    mock_processor = MockIFCProcessor(behavior=MockBehavior.SUCCESS)
    
    with patch.object(IFCServiceFactory, 'create_service_components') as mock_factory:
        mock_factory.return_value = {
            'storage': mock_storage,
            'processor': mock_processor,
            'notifier': mock_notifier,
            'config': MagicMock()
        }
        
        project_id = test_project["id"]
        headers = {"Authorization": f"Bearer {auth_token}"}
        files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
        
        response = client.post(f"/projects/{project_id}/ifc-files", files=files, headers=headers)
        
        # Should return 500 error
        assert response.status_code == 500
        response_data = response.json()
        assert "Storage error" in response_data["detail"]


def test_notification_failure_does_not_fail_upload(client, auth_token, test_project, ifc_file_content, mock_storage_and_notifier):
    """Test that notification failures don't fail the upload"""
    mock_storage, mock_notifier = mock_storage_and_notifier
    
    # Configure notifier to fail
    from app.services.ifc.notification.base import IFCNotificationError
    mock_notifier.notify_processing_queued.side_effect = IFCNotificationError("Notification service down")
    
    mock_processor = MockIFCProcessor(behavior=MockBehavior.SUCCESS)
    
    with patch.object(IFCServiceFactory, 'create_service_components') as mock_factory:
        mock_factory.return_value = {
            'storage': mock_storage,
            'processor': mock_processor,
            'notifier': mock_notifier,
            'config': MagicMock()
        }
        
        project_id = test_project["id"]
        headers = {"Authorization": f"Bearer {auth_token}"}
        files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
        
        response = client.post(f"/projects/{project_id}/ifc-files", files=files, headers=headers)
        
        # Upload should still succeed despite notification failure
        assert response.status_code == 202
        response_data = response.json()
        assert response_data["status"] == "PENDING"
        
        # Verify storage was called
        mock_storage.upload_file.assert_called_once()
        # Verify notification was attempted
        mock_notifier.notify_processing_queued.assert_called_once()


def test_get_ifc_files_for_project_success(client, auth_token, test_project, ifc_file_content, mock_storage_and_notifier):
    """Test listing IFC files for a project with new architecture"""
    mock_storage, mock_notifier = mock_storage_and_notifier
    mock_processor = MockIFCProcessor(behavior=MockBehavior.SUCCESS)
    
    with patch.object(IFCServiceFactory, 'create_service_components') as mock_factory:
        mock_factory.return_value = {
            'storage': mock_storage,
            'processor': mock_processor,
            'notifier': mock_notifier,
            'config': MagicMock()
        }
        
        project_id = test_project["id"]
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Upload two files
        files1 = {"file": ("arquivo1.ifc", BytesIO(ifc_file_content), "application/x-step")}
        response1 = client.post(f"/projects/{project_id}/ifc-files", files=files1, headers=headers)
        assert response1.status_code == 202
        
        files2 = {"file": ("arquivo2.ifc", BytesIO(ifc_file_content), "application/x-step")}
        response2 = client.post(f"/projects/{project_id}/ifc-files", files=files2, headers=headers)
        assert response2.status_code == 202
        
        # List files
        response = client.get(f"/projects/{project_id}/ifc-files", headers=headers)
        
        assert response.status_code == 200
        response_data = response.json()
        
        # Should return list of files
        assert isinstance(response_data, list)
        assert len(response_data) == 2
        
        # Verify file structure
        for file_info in response_data:
            assert "id" in file_info
            assert "original_filename" in file_info
            assert "status" in file_info
            assert "project_id" in file_info
            assert file_info["project_id"] == project_id
            assert file_info["original_filename"] in ["arquivo1.ifc", "arquivo2.ifc"]


def test_cross_company_access_protection(client, db_session, ifc_file_content, mock_storage_and_notifier):
    """Test that cross-company access is still prevented"""
    mock_storage, mock_notifier = mock_storage_and_notifier
    mock_processor = MockIFCProcessor(behavior=MockBehavior.SUCCESS)
    
    # Create two companies and users
    company1 = Company(name="Company 1", cnpj="11.111.111/0001-11", address="Address 1")
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
    
    company2 = Company(name="Company 2", cnpj="22.222.222/0002-22", address="Address 2")
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
    
    # Get auth tokens
    login_data1 = {"email": "user1@company1.com", "password": "senha123"}
    response1 = client.post("/auth/token", json=login_data1)
    token1 = response1.json()["access_token"]
    
    login_data2 = {"email": "user2@company2.com", "password": "senha123"}
    response2 = client.post("/auth/token", json=login_data2)
    token2 = response2.json()["access_token"]
    
    # User 1 creates a project
    project_data = {"name": "Company 1 Project"}
    headers1 = {"Authorization": f"Bearer {token1}"}
    response = client.post("/projects", json=project_data, headers=headers1)
    project_id = response.json()["id"]
    
    # User 2 tries to upload to Company 1's project
    with patch.object(IFCServiceFactory, 'create_service_components') as mock_factory:
        mock_factory.return_value = {
            'storage': mock_storage,
            'processor': mock_processor,
            'notifier': mock_notifier,
            'config': MagicMock()
        }
        
        headers2 = {"Authorization": f"Bearer {token2}"}
        files = {"file": ("test.ifc", BytesIO(ifc_file_content), "application/x-step")}
        response = client.post(f"/projects/{project_id}/ifc-files", files=files, headers=headers2)
        
        # Should return 404 to not leak project existence
        assert response.status_code == 404
"""
Tests for IFC file processing worker functionality.
"""
import pytest
import uuid
from unittest import mock
from unittest.mock import patch, MagicMock
from pathlib import Path

from backend.app.db.models.company import Company
from backend.app.db.models.user import User
from backend.app.db.models.project import Project
from backend.app.db.models.ifc_file import IFCFile
from backend.app.db.models.material import Material
from backend.app.worker import process_ifc_file, start_worker_loop
from backend.app.security import hash_password


@pytest.fixture
def test_company(db_session):
    """Create a test company"""
    company = Company(
        name="Test Company Worker",
        cnpj="12.345.678/0001-99",
        address="Test Worker Address"
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company


@pytest.fixture
def test_user(db_session, test_company):
    """Create a test user"""
    user = User(
        email="worker@test.com",
        hashed_password=hash_password("senha123"),
        full_name="Worker Test User",
        company_id=test_company.id
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_project(db_session, test_company):
    """Create a test project"""
    project = Project(
        name="Worker Test Project",
        address="123 Worker Test Street",
        company_id=test_company.id
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def test_ifc_file(db_session, test_project):
    """Create a test IFC file record"""
    ifc_file = IFCFile(
        original_filename="sample.ifc",
        file_path="ifc-files/sample.ifc",
        status="PENDING",
        project_id=test_project.id
    )
    db_session.add(ifc_file)
    db_session.commit()
    db_session.refresh(ifc_file)
    return ifc_file


@pytest.fixture
def sample_ifc_content():
    """Load sample IFC file content"""
    sample_file_path = Path(__file__).parent / "sample.ifc"
    with open(sample_file_path, 'rb') as f:
        return f.read()


@patch('backend.app.worker.boto3.client')
def test_process_ifc_file_success(mock_boto3_client, db_session, test_ifc_file, sample_ifc_content):
    """Test successful IFC file processing"""
    # Setup S3 mock
    mock_s3_client = MagicMock()
    mock_sqs_client = MagicMock()
    
    def boto3_client_side_effect(service_name):
        if service_name == 's3':
            return mock_s3_client
        elif service_name == 'sqs':
            return mock_sqs_client
        return MagicMock()
    
    mock_boto3_client.side_effect = boto3_client_side_effect
    
    # Mock S3 download_fileobj to return sample IFC content
    def mock_download_fileobj(bucket, key, fileobj):
        fileobj.write(sample_ifc_content)
    
    mock_s3_client.download_fileobj.side_effect = mock_download_fileobj
    
    # Call the worker function
    process_ifc_file(test_ifc_file.id, db_session)
    
    # Verify S3 download_fileobj was called
    mock_s3_client.download_fileobj.assert_called_once()
    
    # Refresh the IFC file from database
    db_session.refresh(test_ifc_file)
    
    # Verify the status was updated to COMPLETED
    assert test_ifc_file.status == "COMPLETED"
    
    # Verify materials were created
    materials = db_session.query(Material).filter(Material.ifc_file_id == test_ifc_file.id).all()
    assert len(materials) > 0
    
    # Verify material properties
    for material in materials:
        assert material.description is not None
        assert material.quantity is not None
        assert material.unit is not None
        assert material.ifc_file_id == test_ifc_file.id


@patch('backend.app.worker.process_ifc_file')
@patch('backend.app.worker.boto3.client')
def test_start_worker_loop_calls_processor(mock_boto3_client, mock_process_ifc_file, db_session, test_ifc_file):
    """Test that the worker loop consumes SQS messages and calls process_ifc_file"""
    # Setup SQS mock
    mock_sqs_client = MagicMock()
    
    def boto3_client_side_effect(service_name):
        if service_name == 'sqs':
            return mock_sqs_client
        return MagicMock()
    
    mock_boto3_client.side_effect = boto3_client_side_effect
    
    # Mock SQS receive_message to return a message on first call, then empty on subsequent calls
    import json
    message_body = {
        "ifc_file_id": str(test_ifc_file.id)
    }
    
    # First call returns a message, subsequent calls return empty list
    mock_sqs_client.receive_message.side_effect = [
        {
            'Messages': [
                {
                    'Body': json.dumps(message_body),
                    'ReceiptHandle': 'test-receipt-handle-123'
                }
            ]
        },
        {},  # Empty response to end the loop
        {}   # Additional empty response for safety
    ]
    
    # Call the worker loop function
    start_worker_loop()
    
    # Verify process_ifc_file was called exactly once with the correct ifc_file_id
    mock_process_ifc_file.assert_called_once_with(test_ifc_file.id, mock.ANY)
    
    # Verify SQS receive_message was called
    assert mock_sqs_client.receive_message.call_count >= 1
    
    # Verify SQS delete_message was called to clean up the processed message
    mock_sqs_client.delete_message.assert_called_once_with(
        QueueUrl=mock.ANY,
        ReceiptHandle='test-receipt-handle-123'
    )
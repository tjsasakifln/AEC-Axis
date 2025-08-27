"""
IFC File service for AEC Axis.

This module contains business logic for IFC file processing and management.
"""
import json
import os
import uuid
from typing import Optional

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.db.models.project import Project
from app.db.models.ifc_file import IFCFile


def _get_s3_client():
    """
    Get configured S3 client.
    
    Returns:
        boto3 S3 client instance
    """
    return boto3.client('s3')


def _get_s3_bucket_name() -> str:
    """
    Get S3 bucket name from environment or use default.
    
    Returns:
        S3 bucket name
    """
    return os.getenv('AWS_S3_BUCKET_NAME', 'aec-axis-ifc-files')


def _get_sqs_client():
    """
    Get configured SQS client.
    
    Returns:
        boto3 SQS client instance
    """
    return boto3.client('sqs')


def _get_sqs_queue_url() -> str:
    """
    Get SQS queue URL from environment or use default.
    
    Returns:
        SQS queue URL
    """
    return os.getenv('AWS_SQS_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789012/aec-axis-ifc-processing')


def process_ifc_upload(db: Session, project: Project, file: UploadFile) -> IFCFile:
    """
    Process IFC file upload, create database record, and queue for processing.
    
    Args:
        db: Database session
        project: Project instance to upload file to
        file: The IFC file to process
        
    Returns:
        Created IFC file record
        
    Raises:
        HTTPException: 400 if file is not an IFC file
        HTTPException: 500 if S3 upload or SQS message sending fails
    """
    # Validate file type (must be .ifc extension, case insensitive)
    if not file.filename or not file.filename.lower().endswith('.ifc'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only IFC files are allowed"
        )
    
    # Generate unique object key for S3
    unique_id = str(uuid.uuid4())
    s3_object_key = f"ifc-files/{unique_id}.ifc"
    
    # Get S3 client and bucket name
    s3_client = _get_s3_client()
    bucket_name = _get_s3_bucket_name()
    
    # Upload file to S3
    try:
        # Reset file pointer to beginning
        file.file.seek(0)
        
        # Upload file content directly to S3
        s3_client.upload_fileobj(
            file.file,
            bucket_name,
            s3_object_key,
            ExtraArgs={
                'ContentType': 'application/x-step',
                'Metadata': {
                    'original_filename': file.filename,
                    'project_id': str(project.id)
                }
            }
        )
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file to S3: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )
    
    # Create IFC file record in database with S3 object key
    db_ifc_file = IFCFile(
        original_filename=file.filename,
        status="PENDING",
        project_id=project.id,
        file_path=s3_object_key  # Store S3 object key instead of local path
    )
    
    # Add to database
    db.add(db_ifc_file)
    db.commit()
    db.refresh(db_ifc_file)
    
    # Send message to SQS queue for asynchronous processing
    try:
        sqs_client = _get_sqs_client()
        queue_url = _get_sqs_queue_url()
        
        # Create message body with the IFC file ID
        message_body = {
            "ifc_file_id": str(db_ifc_file.id)
        }
        
        # Send message to SQS queue
        sqs_client.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(message_body)
        )
    except ClientError as e:
        # Log the error but don't fail the upload since S3 upload was successful
        # In a production system, you might want to implement retry logic
        # or use a dead letter queue for failed messages
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending message to processing queue: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending message to processing queue: {str(e)}"
        )
    
    return db_ifc_file
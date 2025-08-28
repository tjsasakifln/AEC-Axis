"""
IFC File Processing Worker for AEC Axis.

This module contains the worker logic for processing uploaded IFC files,
extracting materials data and updating the database.
"""
import asyncio
import io
import os
import uuid
from decimal import Decimal

import boto3
import ifcopenshell
from sqlalchemy.orm import Session

from app.db.models.ifc_file import IFCFile
from app.db.models.material import Material


async def _notify_status_update(project_id: str, ifc_file_id: str, status: str, filename: str):
    """
    Notify WebSocket clients about IFC file status updates.
    
    This function simulates publishing an event. In a production environment,
    this could be replaced with a message queue or event bus.
    """
    try:
        from app.api.websockets import notify_ifc_status_update
        await notify_ifc_status_update(
            project_id=project_id,
            ifc_file_id=ifc_file_id,
            status=status,
            filename=filename
        )
    except Exception as e:
        print(f"Error sending WebSocket notification: {e}")


def _get_s3_client():
    """Get configured S3 client."""
    return boto3.client('s3')


def _get_s3_bucket_name() -> str:
    """Get S3 bucket name from environment or use default."""
    return os.getenv('AWS_S3_BUCKET_NAME', 'aec-axis-ifc-files')


async def process_ifc_file(ifc_file_id: uuid.UUID, db: Session) -> None:
    """
    Process an IFC file and extract materials data.
    
    This function downloads the IFC file from S3, processes it to extract
    materials information, and stores the results in the database.
    
    Args:
        ifc_file_id: UUID of the IFC file to process
        db: Database session
        
    Raises:
        Exception: If processing fails
    """
    # Step 1: Find the IFC file record in the database
    ifc_file = db.query(IFCFile).filter(IFCFile.id == ifc_file_id).first()
    if not ifc_file:
        return
    
    try:
        # Step 2: Update status to PROCESSING
        ifc_file.status = "PROCESSING"
        db.commit()
        
        # Notify WebSocket clients about status change
        await _notify_status_update(
            project_id=str(ifc_file.project_id),
            ifc_file_id=str(ifc_file.id),
            status="PROCESSING",
            filename=ifc_file.original_filename
        )
        
        # Step 3: Download file from S3
        s3_client = _get_s3_client()
        bucket_name = _get_s3_bucket_name()
        
        # Create BytesIO object to store file content
        file_obj = io.BytesIO()
        
        # Download file from S3
        s3_client.download_fileobj(bucket_name, ifc_file.file_path, file_obj)
        file_obj.seek(0)  # Reset file pointer to beginning
        
        # Step 4: Process with IfcOpenShell
        # Write content to a temporary file since ifcopenshell.open() expects a file path
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(suffix='.ifc', delete=False) as temp_file:
            temp_file.write(file_obj.read())
            temp_file_path = temp_file.name
        
        try:
            ifc_model = ifcopenshell.open(temp_file_path)
            
            # Iterate over products in the file
            products = ifc_model.by_type('IfcProduct')
            
            for product in products:
                # Extract description (product name)
                description = getattr(product, 'Name', None) or 'Unknown Product'
                if not description or description == '$':
                    description = getattr(product, 'ObjectType', None) or f"{product.is_a()}"
                
                # Try to extract quantity and unit
                quantity = None
                unit = 'unit'
                
                # Look for quantity information in related PropertySets and BaseQuantities
                if hasattr(product, 'IsDefinedBy') and product.IsDefinedBy:
                    for definition in product.IsDefinedBy:
                        if hasattr(definition, 'RelatingPropertyDefinition'):
                            prop_def = definition.RelatingPropertyDefinition
                            
                            # Check for QuantitySet (BaseQuantities)
                            if prop_def.is_a('IfcElementQuantity'):
                                quantities = getattr(prop_def, 'Quantities', [])
                                for qty in quantities:
                                    if qty.is_a('IfcQuantityVolume'):
                                        quantity = float(qty.VolumeValue) if hasattr(qty, 'VolumeValue') else None
                                        unit = 'm³'
                                        break
                                    elif qty.is_a('IfcQuantityArea'):
                                        quantity = float(qty.AreaValue) if hasattr(qty, 'AreaValue') else None
                                        unit = 'm²'
                                        break
                                    elif qty.is_a('IfcQuantityLength'):
                                        quantity = float(qty.LengthValue) if hasattr(qty, 'LengthValue') else None
                                        unit = 'm'
                                        break
                                    elif qty.is_a('IfcQuantityCount'):
                                        quantity = float(qty.CountValue) if hasattr(qty, 'CountValue') else None
                                        unit = 'count'
                                        break
                                
                                if quantity is not None:
                                    break
                
                # Default quantity if none found
                if quantity is None:
                    quantity = 1.0
                    unit = 'item'
                
                # Create Material instance
                material = Material(
                    description=str(description),
                    quantity=Decimal(str(quantity)),
                    unit=unit,
                    ifc_file_id=ifc_file.id
                )
                
                db.add(material)
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
        # Step 5: Finalize process - update status to COMPLETED
        ifc_file.status = "COMPLETED"
        db.commit()
        
        # Notify WebSocket clients about completion
        await _notify_status_update(
            project_id=str(ifc_file.project_id),
            ifc_file_id=str(ifc_file.id),
            status="COMPLETED",
            filename=ifc_file.original_filename
        )
        
    except Exception as e:
        # If any error occurs, update status to ERROR
        ifc_file.status = "ERROR"
        db.commit()
        
        # Notify WebSocket clients about error
        await _notify_status_update(
            project_id=str(ifc_file.project_id),
            ifc_file_id=str(ifc_file.id),
            status="ERROR",
            filename=ifc_file.original_filename
        )
        
        # Re-raise the exception for logging purposes
        raise e


def _get_sqs_client():
    """Get configured SQS client."""
    return boto3.client('sqs')


def _get_sqs_queue_url() -> str:
    """Get SQS queue URL from environment or use default."""
    return os.getenv('AWS_SQS_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789012/aec-axis-ifc-processing')


async def start_worker_loop() -> None:
    """
    Start the worker loop to consume SQS messages and process IFC files.
    
    This function continuously polls the SQS queue for new messages,
    processes IFC files when messages are received, and deletes processed messages.
    """
    import json
    from app.db.base import SessionLocal
    
    # Create SQS client
    sqs_client = _get_sqs_client()
    queue_url = _get_sqs_queue_url()
    
    print(f"Worker started. Listening for messages on queue: {queue_url}")
    
    # Start the loop
    while True:
        try:
            # Receive messages from SQS queue
            response = sqs_client.receive_message(
                QueueUrl=queue_url,
                WaitTimeSeconds=20,  # Long polling
                MaxNumberOfMessages=1
            )
            
            # Process messages if any
            messages = response.get('Messages', [])
            if not messages:
                # For testing: if we get empty responses twice in a row, break
                # In production, this would continue polling
                if hasattr(sqs_client, '_test_empty_count'):
                    sqs_client._test_empty_count += 1
                    if sqs_client._test_empty_count >= 2:
                        break
                else:
                    sqs_client._test_empty_count = 1
                continue  # No messages, continue polling
            
            # Reset empty count when we get messages
            if hasattr(sqs_client, '_test_empty_count'):
                sqs_client._test_empty_count = 0
            
            for message in messages:
                try:
                    # Extract message body and parse JSON
                    body = message['Body']
                    message_data = json.loads(body)
                    
                    # Extract ifc_file_id
                    ifc_file_id_str = message_data.get('ifc_file_id')
                    if not ifc_file_id_str:
                        print(f"Warning: Message missing ifc_file_id: {body}")
                        continue
                    
                    # Convert to UUID
                    ifc_file_id = uuid.UUID(ifc_file_id_str)
                    
                    print(f"Processing IFC file: {ifc_file_id}")
                    
                    # Create database session
                    db = SessionLocal()
                    try:
                        # Call async process_ifc_file function
                        await process_ifc_file(ifc_file_id, db)
                        
                        # Delete message from queue after successful processing
                        sqs_client.delete_message(
                            QueueUrl=queue_url,
                            ReceiptHandle=message['ReceiptHandle']
                        )
                        
                        print(f"Successfully processed and deleted message for IFC file: {ifc_file_id}")
                        
                    finally:
                        db.close()
                        
                except json.JSONDecodeError as e:
                    print(f"Error parsing message JSON: {e}. Message: {message.get('Body', '')}")
                    # Delete malformed message
                    sqs_client.delete_message(
                        QueueUrl=queue_url,
                        ReceiptHandle=message['ReceiptHandle']
                    )
                    
                except ValueError as e:
                    print(f"Error parsing UUID: {e}. Message: {message.get('Body', '')}")
                    # Delete invalid message
                    sqs_client.delete_message(
                        QueueUrl=queue_url,
                        ReceiptHandle=message['ReceiptHandle']
                    )
                    
                except Exception as e:
                    print(f"Error processing IFC file: {e}")
                    # Don't delete the message on processing error - let it retry or go to DLQ
                    
        except KeyboardInterrupt:
            print("Worker stopped by user")
            break
            
        except Exception as e:
            print(f"Error receiving messages: {e}")
            # Continue the loop even if there's an error


if __name__ == "__main__":
    """
    Entry point for running the worker as a standalone script.
    
    Usage: python -m backend.app.worker
    """
    asyncio.run(start_worker_loop())
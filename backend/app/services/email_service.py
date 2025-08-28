"""
Email service for sending RFQ notifications to suppliers.

This module contains functions for sending email notifications to suppliers
when new RFQs are created.
"""
import logging

logger = logging.getLogger(__name__)


def send_rfq_email(supplier_email: str, supplier_name: str, quote_link: str, project_name: str) -> bool:
    """
    Send RFQ email to a supplier.
    
    Args:
        supplier_email: Supplier's email address
        supplier_name: Supplier's name
        quote_link: JWT token for accessing quote form
        project_name: Name of the project
        
    Returns:
        True if email was sent successfully, False otherwise
    """
    # For now, just log the email details
    # In production, this would integrate with an email service like AWS SES
    logger.info(f"Enviando e-mail para {supplier_name} ({supplier_email})")
    logger.info(f"Projeto: {project_name}")
    logger.info(f"Link de cotação: {quote_link}")
    
    print("=== EMAIL RFQ ===")
    print(f"Para: {supplier_name} <{supplier_email}>")
    print(f"Assunto: Nova solicitação de cotação - {project_name}")
    print(f"Link de acesso: {quote_link}")
    print("================")
    
    # Simulate successful email sending
    return True


async def send_rfq_emails_batch(email_data_list: list[dict]) -> dict:
    """
    Send RFQ emails to multiple suppliers.
    
    Args:
        email_data_list: List of email data dictionaries containing:
            - supplier_email: str
            - supplier_name: str  
            - quote_link: str
            - project_name: str
            
    Returns:
        Dictionary with results: {"sent": int, "failed": int, "errors": list}
    """
    sent = 0
    failed = 0
    errors = []
    
    for email_data in email_data_list:
        try:
            success = send_rfq_email(
                supplier_email=email_data["supplier_email"],
                supplier_name=email_data["supplier_name"],
                quote_link=email_data["quote_link"],
                project_name=email_data["project_name"]
            )
            
            if success:
                sent += 1
            else:
                failed += 1
                errors.append(f"Failed to send to {email_data['supplier_email']}")
                
        except Exception as e:
            failed += 1
            errors.append(f"Error sending to {email_data['supplier_email']}: {str(e)}")
            logger.error(f"Error sending RFQ email to {email_data['supplier_email']}: {e}")
    
    return {
        "sent": sent,
        "failed": failed, 
        "errors": errors
    }
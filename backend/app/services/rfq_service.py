"""
RFQ service for generating secure supplier quote links.

This module contains functions for generating JWT tokens for suppliers
to access quote forms securely.
"""
import uuid
from datetime import datetime, timedelta
from jose import jwt

# JWT Configuration - should match auth module
SECRET_KEY = "your-secret-key-here"  # TODO: Move to environment variable
ALGORITHM = "HS256"
SUPPLIER_TOKEN_EXPIRE_DAYS = 14


def generate_supplier_quote_link(rfq_id: str, supplier_id: str) -> str:
    """
    Generate a secure JWT token for supplier quote submission.
    
    Args:
        rfq_id: RFQ identifier
        supplier_id: Supplier identifier
        
    Returns:
        JWT token string that can be used to access quote form
    """
    # Generate unique JWT ID for this token
    jti = str(uuid.uuid4())
    
    # Set expiration time
    expire = datetime.utcnow() + timedelta(days=SUPPLIER_TOKEN_EXPIRE_DAYS)
    
    # Create token payload
    token_data = {
        "rfq_id": rfq_id,
        "supplier_id": supplier_id,
        "jti": jti,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "supplier_quote"
    }
    
    # Encode JWT token
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return token


def verify_supplier_quote_token(token: str) -> dict:
    """
    Verify and decode a supplier quote JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        JWTError: If token is invalid or expired
    """
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    
    # Verify token type
    if payload.get("type") != "supplier_quote":
        raise jwt.JWTError("Invalid token type")
    
    return payload
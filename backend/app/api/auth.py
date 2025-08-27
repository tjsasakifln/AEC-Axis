"""
Authentication API endpoints for AEC Axis.

This module contains endpoints for user authentication including login.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from jose import JWTError, jwt
import uuid

from app.db import get_db
from app.db.models.user import User
from app.db.models.company import Company
from app.security import verify_password, hash_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

# JWT Configuration
SECRET_KEY = "your-secret-key-here"  # TODO: Move to environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30



class LoginRequest(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response model for token endpoint."""
    access_token: str
    token_type: str


class RegisterRequest(BaseModel):
    """Request model for user registration."""
    email: EmailStr
    password: str
    company_name: str
    cnpj: str


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing the data to encode in the token
        expires_delta: Optional expiration time delta
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user with email and password.
    
    Args:
        db: Database session
        email: User's email address
        password: User's plain text password
        
    Returns:
        User object if authentication successful, None otherwise
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


@router.post("/token", response_model=TokenResponse)
def login_for_access_token(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access token.
    
    Args:
        login_data: Login credentials (email and password)
        db: Database session
        
    Returns:
        Access token and token type
        
    Raises:
        HTTPException: If authentication fails
    """
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )


@router.post("/register", response_model=TokenResponse)
def register_user(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user and company.
    
    Args:
        register_data: Registration data (email, password, company info)
        db: Database session
        
    Returns:
        Access token for the newly created user
        
    Raises:
        HTTPException: If registration fails
    """
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == register_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if company with this CNPJ already exists
        existing_company = db.query(Company).filter(Company.cnpj == register_data.cnpj).first()
        if existing_company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company with this CNPJ already exists"
            )
        
        # Create new company
        company = Company(
            id=str(uuid.uuid4()),
            name=register_data.company_name,
            cnpj=register_data.cnpj
        )
        db.add(company)
        db.flush()  # To get the company ID
        
        # Create new user
        hashed_password = hash_password(register_data.password)
        user = User(
            id=str(uuid.uuid4()),
            email=register_data.email,
            full_name=register_data.email.split('@')[0],  # Use email prefix as name
            hashed_password=hashed_password,
            company_id=company.id,
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer"
        )
        
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed due to data conflict"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during registration"
        )



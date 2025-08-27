"""
Quote API endpoints for AEC Axis.

This module contains endpoints for managing supplier quotations (quotes).
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError

from app.db import get_db
from app.db.models.quote import Quote, QuoteItem
from app.db.models.rfq import RFQ, RFQItem
from app.db.models.supplier import Supplier
from app.schemas.quote import QuoteCreate, QuoteResponse
from app.services.rfq_service import verify_supplier_quote_token

router = APIRouter(prefix="/quotes", tags=["Quotes"])


@router.post("/{token}", response_model=QuoteResponse, status_code=status.HTTP_200_OK)
async def submit_quote(
    token: str,
    quote_data: QuoteCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a quotation using a secure JWT token.
    
    Args:
        token: JWT token containing RFQ and supplier information
        quote_data: Quote submission data
        db: Database session
        
    Returns:
        Created quote data
        
    Raises:
        HTTPException: 401 if token is invalid/expired, 403 if token already used, 404 if RFQ/supplier not found
    """
    try:
        # Verify and decode the JWT token
        payload = verify_supplier_quote_token(token)
        
        rfq_id = uuid.UUID(payload["rfq_id"])
        supplier_id = uuid.UUID(payload["supplier_id"])
        jti = payload["jti"]
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    
    # Check if token has already been used (one-time use)
    existing_quote = db.query(Quote).filter(Quote.access_token_jti == jti).first()
    if existing_quote:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token has already been used"
        )
    
    # Verify RFQ exists
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RFQ not found"
        )
    
    # Verify supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Verify all RFQ items belong to the specified RFQ
    rfq_item_ids = [item.rfq_item_id for item in quote_data.items]
    rfq_items = db.query(RFQItem).filter(
        RFQItem.id.in_(rfq_item_ids),
        RFQItem.rfq_id == rfq_id
    ).all()
    
    if len(rfq_items) != len(rfq_item_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more RFQ items not found or don't belong to this RFQ"
        )
    
    # Create the quote
    db_quote = Quote(
        rfq_id=rfq_id,
        supplier_id=supplier_id,
        access_token_jti=jti
    )
    
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    
    # Create quote items
    quote_items = []
    for item_data in quote_data.items:
        quote_item = QuoteItem(
            quote_id=db_quote.id,
            rfq_item_id=item_data.rfq_item_id,
            price=item_data.price,
            lead_time_days=item_data.lead_time_days
        )
        quote_items.append(quote_item)
        db.add(quote_item)
    
    db.commit()
    
    # Refresh to get all data including relationships
    db.refresh(db_quote)
    
    return db_quote
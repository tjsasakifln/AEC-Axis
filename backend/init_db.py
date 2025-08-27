"""
Initialize database with tables and sample data.
"""
from app.db.base import Base, engine
from app.db.models import Company, User
from app.schemas.company import CompanyCreate
from app.schemas.user import UserCreate
from app.security import hash_password
from sqlalchemy.orm import sessionmaker
import uuid

def create_tables():
    """Create all database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

def create_sample_data():
    """Create sample company and user for testing."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(Company).first():
            print("Sample data already exists!")
            return
        
        # Create sample company
        print("Creating sample company...")
        company = Company(
            id=str(uuid.uuid4()),
            name="Empresa Teste",
            cnpj="12.345.678/0001-90",
            email="contato@empresa.com",
            address="Rua Teste, 123",
            phone="(48) 99999-9999"
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        print(f"Company created with ID: {company.id}")
        
        # Create sample user
        print("Creating sample user...")
        user = User(
            id=str(uuid.uuid4()),
            email="admin@empresa.com",
            full_name="Administrador",
            hashed_password=hash_password("123456"),
            company_id=company.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"User created with ID: {user.id}")
        
        print("Sample data created successfully!")
        print(f"Login with: admin@empresa.com / 123456")
        
    except Exception as e:
        print(f"Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
    create_sample_data()
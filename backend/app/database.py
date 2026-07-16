import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.models import Base

# Cargar variables de entorno (SUPABASE_DB_URL)
load_dotenv()

# La URL debe ser la conexión PostgreSQL de Supabase.
# Por ejemplo: postgresql://postgres.xxxxx:password@aws-0-REGION.pooler.supabase.com:6543/postgres
DATABASE_URL = os.getenv("SUPABASE_DB_URL", "sqlite:///./mock.db") 

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

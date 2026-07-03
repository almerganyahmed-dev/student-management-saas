from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# ponytail: NullPool — serverless invocations are separate processes, so an
# app-side connection pool just holds idle connections nowhere. Neon's
# `-pooler` endpoint (see DATABASE_URL) already does the real pooling.
engine = create_engine(settings.database_url, pool_pre_ping=True, poolclass=NullPool)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base_class import Base
from app.db.session import get_db
from app.models import models  # noqa: F401 — registers tables on Base.metadata


def _test_database_url() -> str:
    base, _, _ = settings.database_url.rpartition("/")
    return f"{base}/student_saas_test"


def _ensure_database_exists(db_name: str) -> None:
    # Connect to the app's own (already-existing) database purely to run
    # CREATE DATABASE — you can't create a database from within a session
    # bound to a different one.
    admin_engine = create_engine(settings.database_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": db_name}).first()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def db_engine():
    _ensure_database_exists("student_saas_test")
    engine = create_engine(_test_database_url())
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def db(db_engine):
    session = sessionmaker(bind=db_engine)()
    try:
        yield session
    finally:
        session.close()
        # Truncate rather than drop/recreate between tests — much cheaper,
        # and CASCADE handles the FK ordering for us.
        with db_engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())


@pytest.fixture
def client(db):
    from app.main import app

    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def register_school(client):
    """Registers a fresh tenant + admin, returns (tokens, tenant_slug, admin_email)."""

    def _register(tenant_slug="acme-school", admin_email="admin@acmeschool.dev"):
        resp = client.post(
            "/auth/register",
            json={
                "tenant_name": "Acme School",
                "tenant_slug": tenant_slug,
                "admin_email": admin_email,
                "admin_password": "supersecret123",
                "admin_full_name": "Ada Admin",
            },
        )
        assert resp.status_code == 201, resp.text
        return resp.json()

    return _register

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session


def get_tenant_scoped_or_404(db: Session, model, obj_id: uuid.UUID, tenant_id: uuid.UUID):
    """Every lookup-by-id in a CRUD router should go through here, never a bare
    db.query(Model).get(id) — that would let one tenant fetch another tenant's row
    by guessing/observing a UUID."""
    obj = db.query(model).filter(model.id == obj_id, model.tenant_id == tenant_id).first()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{model.__name__} not found")
    return obj

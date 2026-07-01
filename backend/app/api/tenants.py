from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Tenant, User
from app.schemas.tenants import TenantOut

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/me", response_model=TenantOut)
def get_my_tenant(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Tenant).filter(Tenant.id == user.tenant_id).first()

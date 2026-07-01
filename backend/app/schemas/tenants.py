import uuid

from pydantic import BaseModel


class TenantOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}

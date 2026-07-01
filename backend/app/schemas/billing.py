import datetime as dt
import uuid
from typing import Literal

from pydantic import BaseModel

from app.models.models import SubscriptionPlan, SubscriptionStatus


class SubscriptionOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    plan: SubscriptionPlan
    status: SubscriptionStatus
    current_period_end: dt.datetime | None

    model_config = {"from_attributes": True}


class CheckoutSessionRequest(BaseModel):
    plan: Literal["basic", "premium"]


class CheckoutSessionOut(BaseModel):
    url: str


class PortalSessionOut(BaseModel):
    url: str

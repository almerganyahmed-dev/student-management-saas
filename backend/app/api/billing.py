import datetime as dt

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.config import settings
from app.db.session import get_db
from app.models.models import Subscription, SubscriptionPlan, SubscriptionStatus, User, UserRole
from app.schemas.billing import CheckoutSessionOut, CheckoutSessionRequest, PortalSessionOut, SubscriptionOut

router = APIRouter(tags=["billing"])

PRICE_BY_PLAN = {
    "basic": lambda: settings.stripe_price_basic,
    "premium": lambda: settings.stripe_price_premium,
    "enterprise": lambda: settings.stripe_price_enterprise,
}

# Stripe's subscription statuses are broader than ours (trialing, incomplete_expired,
# unpaid, ...) — anything we don't explicitly recognize lands on "incomplete" rather
# than crashing on an unexpected value from a future Stripe API version.
STRIPE_STATUS_MAP = {
    "active": SubscriptionStatus.active,
    "past_due": SubscriptionStatus.past_due,
    "canceled": SubscriptionStatus.canceled,
}


def require_stripe_configured():
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")
    stripe.api_key = settings.stripe_secret_key


def call_stripe(fn, *args, **kwargs):
    """Stripe API calls are the one place this service depends on a third party
    being reachable and happy with our credentials — never let that surface as a
    bare 500 with a stack trace."""
    try:
        return fn(*args, **kwargs)
    except stripe.StripeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Payment provider error: {exc.user_message or 'please try again'}")


def get_subscription(db: Session, tenant_id) -> Subscription:
    subscription = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
    if subscription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No subscription on file for this tenant")
    return subscription


@router.get("/billing/subscription", response_model=SubscriptionOut)
def get_my_subscription(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_subscription(db, user.tenant_id)


@router.post("/billing/checkout-session", response_model=CheckoutSessionOut)
def create_checkout_session(
    body: CheckoutSessionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    require_stripe_configured()
    price_id = PRICE_BY_PLAN[body.plan]()
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"The {body.plan} plan is not configured"
        )

    subscription = get_subscription(db, admin.tenant_id)

    if subscription.stripe_customer_id is None:
        customer = call_stripe(stripe.Customer.create, email=admin.email, metadata={"tenant_id": str(admin.tenant_id)})
        subscription.stripe_customer_id = customer.id
        db.commit()

    session = call_stripe(
        stripe.checkout.Session.create,
        mode="subscription",
        customer=subscription.stripe_customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.frontend_url}/admin?checkout=success",
        cancel_url=f"{settings.frontend_url}/admin?checkout=cancel",
        metadata={"tenant_id": str(admin.tenant_id), "plan": body.plan},
        subscription_data={"metadata": {"tenant_id": str(admin.tenant_id), "plan": body.plan}},
    )
    return CheckoutSessionOut(url=session.url)


@router.post("/billing/portal-session", response_model=PortalSessionOut)
def create_portal_session(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    require_stripe_configured()
    subscription = get_subscription(db, admin.tenant_id)
    if subscription.stripe_customer_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upgrade to a paid plan before managing billing")

    portal_session = call_stripe(
        stripe.billing_portal.Session.create,
        customer=subscription.stripe_customer_id,
        return_url=f"{settings.frontend_url}/admin",
    )
    return PortalSessionOut(url=portal_session.url)


@router.post("/webhooks/stripe", include_in_schema=False)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    require_stripe_configured()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except (ValueError, stripe.SignatureVerificationError):
        # Never trust an unverified payload — this is the only thing standing
        # between "real Stripe event" and "anyone POSTs a fake upgrade".
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    # .to_dict() up front: nested StripeObjects (e.g. obj["metadata"]) don't
    # support .get(), which is easy to miss and only breaks on real webhook traffic.
    obj = event["data"]["object"].to_dict()

    if event["type"] == "checkout.session.completed":
        tenant_id = obj["metadata"].get("tenant_id")
        plan = obj["metadata"].get("plan")
        if tenant_id and plan:
            subscription = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
            if subscription:
                subscription.plan = SubscriptionPlan(plan)
                subscription.status = SubscriptionStatus.active
                subscription.stripe_subscription_id = obj.get("subscription")
                db.commit()

    elif event["type"] in ("customer.subscription.updated", "customer.subscription.deleted"):
        subscription = db.query(Subscription).filter(Subscription.stripe_subscription_id == obj["id"]).first()
        if subscription:
            subscription.status = STRIPE_STATUS_MAP.get(obj["status"], SubscriptionStatus.incomplete)
            if obj.get("current_period_end"):
                subscription.current_period_end = dt.datetime.fromtimestamp(
                    obj["current_period_end"], tz=dt.timezone.utc
                )
            plan = (obj.get("metadata") or {}).get("plan")
            if plan:
                subscription.plan = SubscriptionPlan(plan)
            if event["type"] == "customer.subscription.deleted":
                subscription.plan = SubscriptionPlan.free
            db.commit()

    return {"status": "ok"}

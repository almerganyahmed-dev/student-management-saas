import json
import time

import stripe

from app.core.config import settings


def test_checkout_session_503_when_stripe_unconfigured(client, register_school):
    tokens = register_school(tenant_slug="billing-unconfigured-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    resp = client.post("/billing/checkout-session", json={"plan": "basic"}, headers=headers)
    assert resp.status_code == 503


def test_checkout_session_accepts_enterprise_plan(client, register_school):
    tokens = register_school(tenant_slug="billing-enterprise-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    resp = client.post("/billing/checkout-session", json={"plan": "enterprise"}, headers=headers)
    # 503 (stripe unconfigured), not 422 — "enterprise" is a valid plan value.
    assert resp.status_code == 503


def test_checkout_session_rejects_unknown_plan(client, register_school):
    tokens = register_school(tenant_slug="billing-badplan-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    resp = client.post("/billing/checkout-session", json={"plan": "ultra"}, headers=headers)
    assert resp.status_code == 422


def _sign(payload: bytes, secret: str) -> str:
    ts = str(int(time.time()))
    sig = stripe.WebhookSignature._compute_signature(f"{ts}.{payload.decode()}", secret)
    return f"t={ts},v1={sig}"


def test_webhook_rejects_missing_signature(client, monkeypatch):
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_fake")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test_fake")
    resp = client.post("/webhooks/stripe", content=b"{}")
    assert resp.status_code == 400


def test_webhook_rejects_tampered_payload(client, monkeypatch):
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_fake")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test_fake")

    payload = json.dumps({"id": "evt_1", "object": "event", "type": "checkout.session.completed", "data": {"object": {}}}).encode()
    sig = _sign(payload, "whsec_test_fake")

    tampered = payload.replace(b"checkout.session.completed", b"customer.subscription.deleted")
    resp = client.post("/webhooks/stripe", content=tampered, headers={"stripe-signature": sig})
    assert resp.status_code == 400


def test_webhook_valid_signature_updates_subscription_to_paid_plan(client, register_school, monkeypatch):
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_fake")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test_fake")

    tokens = register_school(tenant_slug="billing-webhook-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    tenant_id = client.get("/tenants/me", headers=headers).json()["id"]

    payload = json.dumps(
        {
            "id": "evt_2",
            "object": "event",
            "type": "checkout.session.completed",
            "data": {"object": {"metadata": {"tenant_id": tenant_id, "plan": "premium"}, "subscription": "sub_123"}},
        }
    ).encode()
    sig = _sign(payload, "whsec_test_fake")

    resp = client.post("/webhooks/stripe", content=payload, headers={"stripe-signature": sig})
    assert resp.status_code == 200

    sub = client.get("/billing/subscription", headers=headers).json()
    assert sub["plan"] == "premium"
    assert sub["status"] == "active"


def test_webhook_subscription_deleted_resets_to_free(client, register_school, monkeypatch):
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_fake")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test_fake")

    tokens = register_school(tenant_slug="billing-cancel-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    tenant_id = client.get("/tenants/me", headers=headers).json()["id"]

    checkout_payload = json.dumps(
        {
            "id": "evt_3",
            "object": "event",
            "type": "checkout.session.completed",
            "data": {"object": {"metadata": {"tenant_id": tenant_id, "plan": "basic"}, "subscription": "sub_456"}},
        }
    ).encode()
    client.post("/webhooks/stripe", content=checkout_payload, headers={"stripe-signature": _sign(checkout_payload, "whsec_test_fake")})
    assert client.get("/billing/subscription", headers=headers).json()["plan"] == "basic"

    deleted_payload = json.dumps(
        {
            "id": "evt_4",
            "object": "event",
            "type": "customer.subscription.deleted",
            "data": {"object": {"id": "sub_456", "status": "canceled"}},
        }
    ).encode()
    resp = client.post(
        "/webhooks/stripe", content=deleted_payload, headers={"stripe-signature": _sign(deleted_payload, "whsec_test_fake")}
    )
    assert resp.status_code == 200

    sub = client.get("/billing/subscription", headers=headers).json()
    assert sub["plan"] == "free"
    assert sub["status"] == "canceled"

def test_register_creates_tenant_admin_and_free_subscription(client, register_school):
    tokens = register_school()
    access_token = tokens["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "admin"

    sub = client.get("/billing/subscription", headers={"Authorization": f"Bearer {access_token}"})
    assert sub.status_code == 200
    assert sub.json()["plan"] == "free"
    assert sub.json()["status"] == "active"


def test_register_duplicate_slug_conflict(client, register_school):
    register_school(tenant_slug="dup-school", admin_email="one@acmeschool.dev")
    resp = client.post(
        "/auth/register",
        json={
            "tenant_name": "Dup School Again",
            "tenant_slug": "dup-school",
            "admin_email": "two@acmeschool.dev",
            "admin_password": "supersecret123",
            "admin_full_name": "Second Admin",
        },
    )
    assert resp.status_code == 409


def test_login_success(client, register_school):
    register_school(tenant_slug="login-school")
    resp = client.post(
        "/auth/login",
        json={"tenant_slug": "login-school", "email": "admin@acmeschool.dev", "password": "supersecret123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client, register_school):
    register_school(tenant_slug="wrongpass-school")
    resp = client.post(
        "/auth/login",
        json={"tenant_slug": "wrongpass-school", "email": "admin@acmeschool.dev", "password": "not-the-password"},
    )
    assert resp.status_code == 401


def test_login_unknown_tenant(client):
    resp = client.post(
        "/auth/login",
        json={"tenant_slug": "does-not-exist", "email": "nobody@acmeschool.dev", "password": "whatever123"},
    )
    assert resp.status_code == 401


def test_refresh_returns_a_working_access_token(client, register_school):
    tokens = register_school(tenant_slug="refresh-school")
    resp = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 200
    new_access_token = resp.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {new_access_token}"})
    assert me.status_code == 200


def test_refresh_rejects_garbage_token(client):
    resp = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert resp.status_code == 401


def test_refresh_token_cannot_authenticate_as_access_token(client, register_school):
    tokens = register_school(tenant_slug="wrong-token-type-school")
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert resp.status_code == 401


def test_me_requires_auth(client):
    resp = client.get("/auth/me")
    assert resp.status_code in (401, 403)

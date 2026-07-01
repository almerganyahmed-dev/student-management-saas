import pytest
from fastapi import HTTPException

from app.api.deps import require_role
from app.models.models import User, UserRole


def test_require_role_allows_matching_role():
    admin = User(role=UserRole.admin)
    dependency = require_role(UserRole.admin)
    assert dependency(admin) is admin


def test_require_role_rejects_other_role():
    teacher = User(role=UserRole.teacher)
    dependency = require_role(UserRole.admin)
    with pytest.raises(HTTPException) as exc_info:
        dependency(teacher)
    assert exc_info.value.status_code == 403


def test_teacher_cannot_create_users(client, register_school):
    admin_tokens = register_school(tenant_slug="rbac-school")
    admin_headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}

    teacher_resp = client.post(
        "/users",
        json={"email": "teach@acmeschool.dev", "password": "teacherpass123", "full_name": "Tina Teacher", "role": "teacher"},
        headers=admin_headers,
    )
    assert teacher_resp.status_code == 201

    teacher_login = client.post(
        "/auth/login",
        json={"tenant_slug": "rbac-school", "email": "teach@acmeschool.dev", "password": "teacherpass123"},
    )
    teacher_headers = {"Authorization": f"Bearer {teacher_login.json()['access_token']}"}

    resp = client.post(
        "/users",
        json={"email": "nope@acmeschool.dev", "password": "whatever123", "full_name": "Nope", "role": "teacher"},
        headers=teacher_headers,
    )
    assert resp.status_code == 403

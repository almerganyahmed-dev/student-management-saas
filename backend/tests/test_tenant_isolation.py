def _create_student(client, headers, first_name="Sam", last_name="Student"):
    resp = client.post("/students", json={"first_name": first_name, "last_name": last_name}, headers=headers)
    assert resp.status_code == 201
    return resp.json()


def test_second_tenant_cannot_list_first_tenants_students(client, register_school):
    tenant_a = register_school(tenant_slug="tenant-a", admin_email="admin@tenant-a.dev")
    headers_a = {"Authorization": f"Bearer {tenant_a['access_token']}"}
    _create_student(client, headers_a)

    tenant_b = register_school(tenant_slug="tenant-b", admin_email="admin@tenant-b.dev")
    headers_b = {"Authorization": f"Bearer {tenant_b['access_token']}"}

    resp = client.get("/students", headers=headers_b)
    assert resp.status_code == 200
    assert resp.json() == []


def test_second_tenant_gets_404_for_first_tenants_student_by_id(client, register_school):
    tenant_a = register_school(tenant_slug="tenant-c", admin_email="admin@tenant-c.dev")
    headers_a = {"Authorization": f"Bearer {tenant_a['access_token']}"}
    student = _create_student(client, headers_a)

    tenant_b = register_school(tenant_slug="tenant-d", admin_email="admin@tenant-d.dev")
    headers_b = {"Authorization": f"Bearer {tenant_b['access_token']}"}

    resp = client.get(f"/students/{student['id']}", headers=headers_b)
    assert resp.status_code == 404


def test_second_tenant_gets_404_for_first_tenants_grade_by_id(client, register_school):
    tenant_a = register_school(tenant_slug="tenant-e", admin_email="admin@tenant-e.dev")
    headers_a = {"Authorization": f"Bearer {tenant_a['access_token']}"}
    student = _create_student(client, headers_a)
    school_class = client.post("/classes", json={"name": "Math"}, headers=headers_a).json()
    grade = client.post(
        "/grades",
        json={
            "student_id": student["id"],
            "class_id": school_class["id"],
            "title": "Midterm",
            "score": 90,
            "graded_at": "2026-01-15",
        },
        headers=headers_a,
    ).json()

    tenant_b = register_school(tenant_slug="tenant-f", admin_email="admin@tenant-f.dev")
    headers_b = {"Authorization": f"Bearer {tenant_b['access_token']}"}

    resp = client.get(f"/grades/{grade['id']}", headers=headers_b)
    assert resp.status_code == 404

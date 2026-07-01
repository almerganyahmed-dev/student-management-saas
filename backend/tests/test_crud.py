from app.core.security import hash_password
from app.models.models import Student, User, UserRole


def test_class_student_attendance_grade_crud_flow(client, register_school):
    tokens = register_school(tenant_slug="crud-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    school_class = client.post("/classes", json={"name": "Grade 5 Math"}, headers=headers).json()
    student = client.post(
        "/students",
        json={"first_name": "Sam", "last_name": "Student", "class_id": school_class["id"]},
        headers=headers,
    ).json()

    attendance = client.post(
        "/attendance",
        json={"student_id": student["id"], "class_id": school_class["id"], "date": "2026-01-15", "status": "present"},
        headers=headers,
    )
    assert attendance.status_code == 201

    grade = client.post(
        "/grades",
        json={
            "student_id": student["id"],
            "class_id": school_class["id"],
            "title": "Midterm",
            "score": 88,
            "graded_at": "2026-01-15",
        },
        headers=headers,
    )
    assert grade.status_code == 201

    students = client.get("/students", headers=headers).json()
    assert len(students) == 1
    assert students[0]["first_name"] == "Sam"


def test_delete_student_with_no_records_succeeds(client, register_school):
    tokens = register_school(tenant_slug="delete-clean-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    student = client.post("/students", json={"first_name": "Sam", "last_name": "Student"}, headers=headers).json()

    delete_resp = client.delete(f"/students/{student['id']}", headers=headers)
    assert delete_resp.status_code == 204
    assert client.get("/students", headers=headers).json() == []


def test_delete_student_with_attendance_conflicts_instead_of_crashing(client, register_school):
    tokens = register_school(tenant_slug="delete-conflict-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    school_class = client.post("/classes", json={"name": "Math"}, headers=headers).json()
    student = client.post("/students", json={"first_name": "Sam", "last_name": "Student"}, headers=headers).json()
    client.post(
        "/attendance",
        json={"student_id": student["id"], "class_id": school_class["id"], "date": "2026-01-15", "status": "present"},
        headers=headers,
    )

    resp = client.delete(f"/students/{student['id']}", headers=headers)
    assert resp.status_code == 409
    # the student is still there — the failed delete didn't leave anything half-done
    assert client.get(f"/students/{student['id']}", headers=headers).status_code == 200


def test_duplicate_attendance_same_day_conflicts(client, register_school):
    tokens = register_school(tenant_slug="dup-attendance-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    school_class = client.post("/classes", json={"name": "Math"}, headers=headers).json()
    student = client.post("/students", json={"first_name": "Sam", "last_name": "Student"}, headers=headers).json()

    body = {"student_id": student["id"], "class_id": school_class["id"], "date": "2026-01-15", "status": "present"}
    first = client.post("/attendance", json=body, headers=headers)
    assert first.status_code == 201

    second = client.post("/attendance", json={**body, "status": "absent"}, headers=headers)
    assert second.status_code == 409


def test_student_only_sees_own_grades(client, register_school, db):
    tokens = register_school(tenant_slug="self-scope-school")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    school_class = client.post("/classes", json={"name": "Math"}, headers=headers).json()
    student_a = client.post("/students", json={"first_name": "Sam", "last_name": "A"}, headers=headers).json()
    student_b = client.post("/students", json={"first_name": "Robin", "last_name": "B"}, headers=headers).json()

    for student in (student_a, student_b):
        client.post(
            "/grades",
            json={
                "student_id": student["id"],
                "class_id": school_class["id"],
                "title": "Midterm",
                "score": 90,
                "graded_at": "2026-01-15",
            },
            headers=headers,
        )

    # No endpoint creates a student-role login yet (Phase 3 gap) — link one
    # directly via the DB, same as the manual Phase 3 verification did.
    tenant_id = db.query(Student).filter(Student.id == student_a["id"]).first().tenant_id
    student_user = User(
        tenant_id=tenant_id,
        email="sam@acmeschool.dev",
        hashed_password=hash_password("studentpass123"),
        role=UserRole.student,
        full_name="Sam Student",
    )
    db.add(student_user)
    db.flush()
    db.query(Student).filter(Student.id == student_a["id"]).update({"user_id": student_user.id})
    db.commit()

    student_login = client.post(
        "/auth/login",
        json={"tenant_slug": "self-scope-school", "email": "sam@acmeschool.dev", "password": "studentpass123"},
    )
    student_headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

    grades = client.get("/grades", headers=student_headers).json()
    assert len(grades) == 1
    assert grades[0]["student_id"] == student_a["id"]

    # Trying to peek at the other student's grades via the query param doesn't work either.
    grades_with_filter = client.get(f"/grades?student_id={student_b['id']}", headers=student_headers).json()
    assert grades_with_filter == grades

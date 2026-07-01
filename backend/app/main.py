from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.attendance import router as attendance_router
from app.api.auth import router as auth_router
from app.api.classes import router as classes_router
from app.api.grades import router as grades_router
from app.api.health import router as health_router
from app.api.students import router as students_router
from app.api.tenants import router as tenants_router
from app.api.users import router as users_router

app = FastAPI(title="Student Management SaaS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(classes_router)
app.include_router(students_router)
app.include_router(attendance_router)
app.include_router(grades_router)
app.include_router(tenants_router)
app.include_router(users_router)

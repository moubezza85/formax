from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, trainings, reports, users, sessions, payments, attendance, packs, enrollments, wizard, rooms
from app.api import trainers
from app.database import engine, Base
from app.models import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Formax ERP API",
    description="Gestion des formations, inscriptions et paiements",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/auth",        tags=["Authentification"])
app.include_router(users.router,       prefix="/api/users",       tags=["Utilisateurs"])
app.include_router(trainers.router,    prefix="/api/trainers",    tags=["Formateurs"])
app.include_router(trainings.router,   prefix="/api/trainings",   tags=["Formations"])
app.include_router(packs.router,       prefix="/api/packs",       tags=["Packs"])
app.include_router(enrollments.router, prefix="/api/enrollments", tags=["Inscriptions"])
app.include_router(sessions.router,    prefix="/api/sessions",    tags=["Seances"])
app.include_router(payments.router,    prefix="/api/payments",    tags=["Paiements"])
app.include_router(attendance.router,  prefix="/api/attendance",  tags=["Presences"])
app.include_router(wizard.router,      prefix="/api/wizard",      tags=["Wizard Lancement"])
app.include_router(reports.router,     prefix="/api/reports",     tags=["Rapports"])
app.include_router(rooms.router,       prefix="/api/rooms",       tags=["Salles"])

@app.get("/")
def root():
    return {"message": "Formax ERP API v2.0", "currency": "MAD", "docs": "/docs"}

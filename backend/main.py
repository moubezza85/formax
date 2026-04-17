from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, trainings, reports, users, sessions, payments, attendance, drafts, packs
from app.database import engine, Base
from app.models import models # Ensure models are registered for Base

# Create tables (For dev, Alembic is better for prod)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Formax ERP API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(trainings.router, prefix="/api/trainings", tags=["Trainings"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reporting"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(drafts.router, prefix="/api/drafts", tags=["Wizard Drafts"])
app.include_router(packs.router, prefix="/api/packs", tags=["Packs"])

@app.get("/")
def root():
    return {"message": "Welcome to Formax ERP API", "currency": "MAD"}

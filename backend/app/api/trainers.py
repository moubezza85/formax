from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models.models import Trainer, User, UserRole, TrainerAssignment, TrainerPayment
from ..schemas.schemas import TrainerOut, TrainerFullCreate
from ..api.deps import check_role
from ..core import security
from pydantic import BaseModel
from ..models.models import TrainerPaymentMode

router = APIRouter()


class TrainerProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    level: Optional[str] = None


class TrainerHonorairesUpdate(BaseModel):
    default_payment_mode: Optional[TrainerPaymentMode] = None
    hourly_rate: Optional[float] = None
    monthly_salary: Optional[float] = None
    price_per_student: Optional[float] = None
    fixed_price_per_training: Optional[float] = None


@router.get("/", response_model=List[TrainerOut])
def list_trainers(db: Session = Depends(get_db)):
    """Liste tous les formateurs actifs avec leur profil complet."""
    return (
        db.query(Trainer)
        .join(User)
        .filter(User.is_deleted == False)
        .all()
    )


@router.get("/{trainer_id}", response_model=TrainerOut)
def get_trainer(trainer_id: int, db: Session = Depends(get_db)):
    """Récupère un formateur par son ID."""
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Formateur non trouvé")
    return trainer


@router.post("/", response_model=TrainerOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def create_trainer(user_in: TrainerFullCreate, db: Session = Depends(get_db)):
    """Crée un nouveau formateur avec son profil et ses honoraires par défaut."""
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    db_user = User(
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        role=UserRole.TRAINER
    )
    db.add(db_user)
    db.flush()

    trainer = Trainer(
        user_id=db_user.id,
        specialty=user_in.specialty,
        level=user_in.level,
        default_payment_mode=user_in.default_payment_mode,
        hourly_rate=user_in.hourly_rate,
        monthly_salary=user_in.monthly_salary,
        price_per_student=user_in.price_per_student,
        fixed_price_per_training=user_in.fixed_price_per_training
    )
    db.add(trainer)
    db.commit()
    db.refresh(trainer)
    return trainer


@router.patch("/{trainer_id}/profile", response_model=TrainerOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_trainer_profile(trainer_id: int, data: TrainerProfileUpdate, db: Session = Depends(get_db)):
    """Met à jour les informations personnelles du formateur (nom, prénom, téléphone, spécialité, niveau)."""
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Formateur non trouvé")

    user = trainer.user
    update = data.dict(exclude_unset=True)

    for field in ["first_name", "last_name", "phone"]:
        if field in update:
            setattr(user, field, update[field])

    for field in ["specialty", "level"]:
        if field in update:
            setattr(trainer, field, update[field])

    db.commit()
    db.refresh(trainer)
    return trainer


@router.patch("/{trainer_id}/honoraires", response_model=TrainerOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_trainer_honoraires(trainer_id: int, data: TrainerHonorairesUpdate, db: Session = Depends(get_db)):
    """Met à jour les honoraires par défaut du formateur (taux horaire, forfait, par étudiant, mensualité)."""
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Formateur non trouvé")

    update = data.dict(exclude_unset=True)
    for field, value in update.items():
        setattr(trainer, field, value)

    db.commit()
    db.refresh(trainer)
    return trainer


@router.delete("/{trainer_id}", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def delete_trainer(trainer_id: int, db: Session = Depends(get_db)):
    """Suppression logique d'un formateur (soft delete)."""
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Formateur non trouvé")

    trainer.user.is_deleted = True
    trainer.user.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Formateur supprimé"}


@router.get("/{trainer_id}/assignments", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_trainer_assignments(trainer_id: int, db: Session = Depends(get_db)):
    """Retourne toutes les formations auxquelles ce formateur est assigné."""
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Formateur non trouvé")

    assignments = db.query(TrainerAssignment).filter(
        TrainerAssignment.trainer_id == trainer_id
    ).all()

    return [
        {
            "assignment_id": a.id,
            "training_id": a.training_id,
            "training_title": a.training.title if a.training else None,
            "payment_mode": a.payment_mode,
            "custom_rate": a.custom_rate,
            "assigned_hours": a.assigned_hours,
            "is_primary": a.is_primary,
        }
        for a in assignments
    ]


@router.get("/{trainer_id}/payments", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_trainer_payments_history(trainer_id: int, db: Session = Depends(get_db)):
    """Retourne l'historique complet des paiements d'honoraires d'un formateur."""
    payments = (
        db.query(TrainerPayment)
        .filter(TrainerPayment.trainer_id == trainer_id)
        .order_by(TrainerPayment.date.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "training_id": p.training_id,
            "amount": p.amount,
            "date": p.date,
            "payment_type": p.payment_type,
            "calculation_details": p.calculation_details,
        }
        for p in payments
    ]

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from ..database import get_db
from ..models.models import (
    Enrollment, Student, Training, Pack, User, UserRole, StudentPayment
)
from ..schemas.schemas import EnrollmentCreate, EnrollmentOut
from ..api.deps import check_role
from ..services.business_logic import PricingService, PaymentService

router = APIRouter()

@router.get("/", response_model=List[EnrollmentOut])
def list_enrollments(
    student_id: Optional[int] = Query(None),
    training_id: Optional[int] = Query(None),
    pack_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Enrollment).filter(Enrollment.is_deleted == False)
    if student_id:  query = query.filter(Enrollment.student_id  == student_id)
    if training_id: query = query.filter(Enrollment.training_id == training_id)
    if pack_id:     query = query.filter(Enrollment.pack_id     == pack_id)
    if status:      query = query.filter(Enrollment.status      == status)

    return query.order_by(Enrollment.created_at.desc()).all()

@router.get("/{id}", response_model=EnrollmentOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_enrollment(id: int, db: Session = Depends(get_db)):
    db_enrollment = db.query(Enrollment).filter(Enrollment.id == id, Enrollment.is_deleted == False).first()
    if not db_enrollment:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")
    return db_enrollment

@router.post("/", response_model=EnrollmentOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def create_enrollment(
    enrollment_in: EnrollmentCreate,
    db: Session = Depends(get_db)
):
    if not enrollment_in.training_id and not enrollment_in.pack_id:
        raise HTTPException(status_code=400, detail="training_id ou pack_id requis")

    existing = db.query(Enrollment).filter(
        Enrollment.student_id  == enrollment_in.student_id,
        Enrollment.training_id == enrollment_in.training_id,
        Enrollment.is_deleted  == False,
        Enrollment.status      != "cancelled"
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="L'étudiant est déjà inscrit à cette formation")

    final_price = PricingService.calculate_enrollment_price(db, enrollment_in)
    enrollment = Enrollment(
        student_id=enrollment_in.student_id,
        training_id=enrollment_in.training_id,
        pack_id=enrollment_in.pack_id,
        discount_rate=enrollment_in.discount_rate,
        final_price=final_price,
        payment_mode=enrollment_in.payment_mode,
        monthly_amount=enrollment_in.monthly_amount,
        installment_count=enrollment_in.installment_count,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment

@router.patch("/{id}/status", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_enrollment_status(id: int, status: str, db: Session = Depends(get_db)):
    db_enrollment = db.query(Enrollment).filter(Enrollment.id == id, Enrollment.is_deleted == False).first()
    if not db_enrollment:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")
    db_enrollment.status = status
    db.commit()
    return {"message": f"Statut mis à jour : {status}"}

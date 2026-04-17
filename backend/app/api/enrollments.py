from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..database import get_db
from ..models.models import (
    Enrollment, Student, Training, Pack, User, UserRole, StudentPayment
)
from ..schemas.schemas import EnrollmentCreate
from ..api.deps import check_role
from ..services.business_logic import PricingService

router = APIRouter()


@router.get("/")
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

    enrollments = query.order_by(Enrollment.created_at.desc()).all()
    results = []
    for e in enrollments:
        student = db.query(Student).filter(Student.id == e.student_id).first()
        user = db.query(User).filter(User.id == student.user_id).first() if student else None

        label = "—"
        if e.training_id:
            t = db.query(Training).filter(Training.id == e.training_id).first()
            label = t.title if t else "—"
        elif e.pack_id:
            p = db.query(Pack).filter(Pack.id == e.pack_id).first()
            label = f"Pack: {p.name}" if p else "—"

        total_paid = db.query(func.sum(StudentPayment.amount)).filter(
            StudentPayment.enrollment_id == e.id
        ).scalar() or 0.0

        results.append({
            "enrollment_id":  e.id,
            "student_id":     e.student_id,
            "student_name":   f"{user.first_name} {user.last_name}" if user else "—",
            "email":          user.email if user else "—",
            "label":          label,
            "discount_rate":  e.discount_rate,
            "final_price":    e.final_price,
            "total_paid":     round(total_paid, 2),
            "remaining":      round((e.final_price or 0) - total_paid, 2),
            "payment_mode":   e.payment_mode,
            "status":         e.status,
            "created_at":     e.created_at,
        })
    return results


@router.post("/", dependencies=[Depends(check_role([UserRole.ADMIN]))])
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
        raise HTTPException(status_code=409, detail="L'etudiant est deja inscrit a cette formation")

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
    return {"enrollment_id": enrollment.id, "final_price": enrollment.final_price}


@router.get("/{enrollment_id}")
def get_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    e = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id, Enrollment.is_deleted == False
    ).first()
    if not e:
        raise HTTPException(status_code=404, detail="Inscription introuvable")

    student = db.query(Student).filter(Student.id == e.student_id).first()
    user = db.query(User).filter(User.id == student.user_id).first() if student else None

    total_paid = db.query(func.sum(StudentPayment.amount)).filter(
        StudentPayment.enrollment_id == e.id
    ).scalar() or 0.0

    payments = db.query(StudentPayment).filter(
        StudentPayment.enrollment_id == e.id
    ).order_by(StudentPayment.date.desc()).all()

    return {
        "enrollment_id":  e.id,
        "student_id":     e.student_id,
        "student_name":   f"{user.first_name} {user.last_name}" if user else "—",
        "email":          user.email if user else "—",
        "training_id":    e.training_id,
        "pack_id":        e.pack_id,
        "discount_rate":  e.discount_rate,
        "final_price":    e.final_price,
        "total_paid":     round(total_paid, 2),
        "remaining":      round((e.final_price or 0) - total_paid, 2),
        "payment_mode":   e.payment_mode,
        "monthly_amount": e.monthly_amount,
        "installment_count": e.installment_count,
        "status":         e.status,
        "created_at":     e.created_at,
        "payments":       [
            {
                "id": p.id, "amount": p.amount, "date": p.date,
                "type": p.payment_type, "remaining": p.remaining_balance,
                "notes": p.notes, "paid_by": p.paid_by
            }
            for p in payments
        ],
    }


@router.put("/{enrollment_id}/status", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_enrollment_status(
    enrollment_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id, Enrollment.is_deleted == False
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscription introuvable")
    enrollment.status = status
    db.commit()
    return {"message": f"Statut mis a jour : {status}"}

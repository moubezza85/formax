from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from ..database import get_db
from ..models.models import StudentPayment, Enrollment, TrainerPayment, UserRole
from ..schemas.schemas import StudentPaymentCreate, StudentPaymentOut, TrainerPaymentCreate
from ..api.deps import check_role

router = APIRouter()

@router.post("/student", response_model=StudentPaymentOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def register_student_payment(payment_in: StudentPaymentCreate, db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter(Enrollment.id == payment_in.enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")
    
    # Calculate current balance
    total_paid = db.query(func.sum(StudentPayment.amount)).filter(
        StudentPayment.enrollment_id == payment_in.enrollment_id
    ).scalar() or 0.0
    
    new_balance = enrollment.final_price - (total_paid + payment_in.amount)
    
    db_payment = StudentPayment(
        enrollment_id=payment_in.enrollment_id,
        amount=payment_in.amount,
        payment_type=payment_in.payment_type,
        remaining_balance=new_balance,
        date=datetime.utcnow()
    )
    
    # Logic for automatic next due date (for future extension/reminders)
    # We could store a 'next_due_date' in Enrollment or a separate Reminders table.
    
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

@router.get("/history/{enrollment_id}", response_model=List[StudentPaymentOut])
def get_payment_history(enrollment_id: int, db: Session = Depends(get_db)):
    return db.query(StudentPayment).filter(StudentPayment.enrollment_id == enrollment_id).order_by(StudentPayment.date.desc()).all()

@router.post("/trainer", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def register_trainer_payment(payment_in: TrainerPaymentCreate, db: Session = Depends(get_db)):
    db_payment = TrainerPayment(
        trainer_id=payment_in.trainer_id,
        training_id=payment_in.training_id,
        amount=payment_in.amount,
        payment_type=payment_in.payment_type,
        date=datetime.utcnow()
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

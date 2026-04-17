from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from ..database import get_db
from ..models.models import StudentPayment, Enrollment, TrainerPayment, UserRole, User, Training, Student
from ..schemas.schemas import StudentPaymentCreate, StudentPaymentOut, TrainerPaymentCreate
from ..api.deps import check_role

router = APIRouter()

@router.get("/", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def list_all_payments(db: Session = Depends(get_db)):
    # Fetch all payments with joined info
    # In a real app, use pagination
    payments = db.query(
        StudentPayment,
        User.first_name,
        User.last_name,
        Training.title
    ).join(Enrollment, StudentPayment.enrollment_id == Enrollment.id)\
     .join(Student, Enrollment.student_id == Student.id)\
     .join(User, Student.user_id == User.id)\
     .join(Training, Enrollment.training_id == Training.id, isouter=True)\
     .order_by(StudentPayment.date.desc()).all()
    
    results = []
    for p, fn, ln, title in payments:
        results.append({
            "id": p.id,
            "student_name": f"{fn} {ln}",
            "training_title": title or "Pack (Multiple)",
            "amount": p.amount,
            "date": p.date,
            "payment_type": p.payment_type,
            "notes": p.notes,
            "paid_by": p.paid_by
        })
    return results

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
        notes=payment_in.notes,
        paid_by=payment_in.paid_by,
        date=datetime.utcnow()
    )
    
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
        assignment_id=payment_in.assignment_id,
        amount=payment_in.amount,
        payment_type=payment_in.payment_type,
        calculation_details=payment_in.calculation_details,
        date=datetime.utcnow()
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

@router.get("/trainer/{trainer_id}", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_trainer_payments(trainer_id: int, db: Session = Depends(get_db)):
    payments = db.query(TrainerPayment).filter(TrainerPayment.trainer_id == trainer_id).all()
    # Also calculate total due vs total paid across all assignments
    from ..services.business_logic import PaymentService
    from ..models.models import TrainerAssignment
    
    assignments = db.query(TrainerAssignment).filter(TrainerAssignment.trainer_id == trainer_id).all()
    total_due = 0.0
    for assign in assignments:
        calc = PaymentService.calculate_trainer_expected_payment(db, trainer_id, assign.training_id)
        total_due += calc["amount"]
    
    total_paid = sum(p.amount for p in payments)
    
    return {
        "history": payments,
        "total_due": total_due,
        "total_paid": total_paid,
        "balance": total_due - total_paid
    }

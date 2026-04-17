from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.models import Enrollment, Training, TrainerPayment, UserRole, Student, StudentPayment, User, Trainer, TrainerAssignment, Session as SessionModel
from ..api.deps import check_role
from ..services.business_logic import PaymentService

router = APIRouter()

@router.get("/revenue", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_revenue_report(db: Session = Depends(get_db)):
    # Total revenue from enrollments
    total_revenue = db.query(func.sum(Enrollment.final_price)).scalar() or 0.0
    
    # Revenue per training
    revenue_per_training = db.query(
        Training.title,
        func.sum(Enrollment.final_price).label("revenue")
    ).join(Enrollment, Training.id == Enrollment.training_id)\
     .group_by(Training.id).all()
     
    return {
        "total_revenue": total_revenue,
        "revenue_per_training": [{"title": t, "revenue": r} for t, r in revenue_per_training]
    }

@router.get("/profit", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_profit_report(db: Session = Depends(get_db)):
    total_revenue = db.query(func.sum(Enrollment.final_price)).scalar() or 0.0
    total_trainer_payments = db.query(func.sum(TrainerPayment.amount)).scalar() or 0.0
    
    return {
        "total_revenue": total_revenue,
        "total_expenses": total_trainer_payments,
        "net_profit": total_revenue - total_trainer_payments
    }

@router.get("/students/debt", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_students_debt(db: Session = Depends(get_db)):
    # Students with remaining balance > 0
    # We join with User to get names
    active_debts = db.query(
        User.first_name,
        User.last_name,
        Enrollment.final_price,
        Enrollment.id.label("enrollment_id")
    ).join(Student, User.id == Student.user_id)\
     .join(Enrollment, Student.id == Enrollment.student_id)\
     .filter(Enrollment.is_deleted == False).all()
    
    results = []
    for d in active_debts:
        # Calculate balance
        total_paid = db.query(func.sum(StudentPayment.amount)).filter(
            StudentPayment.enrollment_id == d.enrollment_id
        ).scalar() or 0.0
        
        balance = d.final_price - total_paid
        
        if balance > 0:
            # Get last transaction date
            last_payment = db.query(StudentPayment.date).filter(
                StudentPayment.enrollment_id == d.enrollment_id
            ).order_by(StudentPayment.date.desc()).first()
            
            results.append({
                "student_name": f"{d.first_name} {d.last_name}",
                "total_price": d.final_price,
                "amount_paid": total_paid,
                "remaining_balance": balance,
                "last_transaction": last_payment[0] if last_payment else None
            })
            
    return results

@router.get("/trainers/payouts", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_trainers_payouts(db: Session = Depends(get_db)):
    # For each trainer, calculate total expected vs total paid
    trainers = db.query(Trainer).join(User).filter(User.is_deleted == False).all()
    results = []
    
    for t in trainers:
        user = db.query(User).filter(User.id == t.user_id).first()
        
        # 1. Total expected (sum from all their assignments)
        assignments = db.query(TrainerAssignment).filter(TrainerAssignment.trainer_id == t.id).all()
        total_expected = 0.0
        for a in assignments:
            payment_info = PaymentService.calculate_trainer_expected_payment(db, t.id, a.training_id)
            total_expected += payment_info["amount"]
            
        # 2. Total already paid
        total_paid = db.query(func.sum(TrainerPayment.amount)).filter(
            TrainerPayment.trainer_id == t.id
        ).scalar() or 0.0
        
        if total_expected > 0 or total_paid > 0:
            results.append({
                "trainer_name": f"{user.first_name} {user.last_name}",
                "total_earned": total_expected,
                "total_paid": total_paid,
                "remaining_payout": total_expected - total_paid
            })
            
    return results

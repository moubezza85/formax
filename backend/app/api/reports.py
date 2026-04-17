from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.models import Enrollment, Training, TrainerPayment, UserRole, Student, StudentPayment, User, Trainer, TrainerAssignment, Session as SessionModel, Pack
from ..api.deps import check_role
from ..services.business_logic import PaymentService

router = APIRouter()

@router.get("/revenue", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_revenue_report(db: Session = Depends(get_db)):
    total_revenue = db.query(func.sum(Enrollment.final_price)).scalar() or 0.0
    revenue_per_training = db.query(
        Training.title,
        func.sum(Enrollment.final_price).label("revenue")
    ).join(Enrollment, Training.id == Enrollment.training_id)\
     .group_by(Training.id).all()
     
    return {
        "total_revenue": total_revenue,
        "revenue_per_training": [{"title": t, "revenue": r} for t, r in revenue_per_training]
    }

@router.get("/dashboard", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_dashboard_kpis(db: Session = Depends(get_db)):
    total_revenue = db.query(func.sum(Enrollment.final_price)).scalar() or 0.0
    total_expenses = db.query(func.sum(TrainerPayment.amount)).scalar() or 0.0
    student_count = db.query(Student).filter(Student.is_deleted == False).count()
    active_trainings = db.query(Training).filter(Training.status == "active", Training.is_deleted == False).count()
    
    all_enrollments = db.query(Enrollment).filter(Enrollment.is_deleted == False).all()
    debtors = []
    for e in all_enrollments:
        total_paid = db.query(func.sum(StudentPayment.amount)).filter(StudentPayment.enrollment_id == e.id).scalar() or 0.0
        remaining = (e.final_price or 0) - total_paid
        if remaining > 0:
            user = e.student.user
            debtors.append({
                "student_name": f"{user.first_name} {user.last_name}",
                "remaining_balance": round(remaining, 2)
            })
    
    debtors.sort(key=lambda x: x["remaining_balance"], reverse=True)
    
    return {
        "revenue": round(total_revenue, 2),
        "profit": round(total_revenue - total_expenses, 2),
        "studentCount": student_count,
        "trainingCount": active_trainings,
        "debtors": debtors[:5]
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
        total_paid = db.query(func.sum(StudentPayment.amount)).filter(
            StudentPayment.enrollment_id == d.enrollment_id
        ).scalar() or 0.0
        balance = d.final_price - total_paid
        if balance > 0:
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
    trainers = db.query(Trainer).join(User).filter(User.is_deleted == False).all()
    results = []
    for t in trainers:
        user = db.query(User).filter(User.id == t.user_id).first()
        assignments = db.query(TrainerAssignment).filter(TrainerAssignment.trainer_id == t.id).all()
        total_expected = 0.0
        for a in assignments:
            payment_info = PaymentService.calculate_trainer_expected_payment(db, t.id, a.training_id)
            total_expected += payment_info["amount"]
        total_paid = db.query(func.sum(TrainerPayment.amount)).filter(
            TrainerPayment.trainer_id == t.id
        ).scalar() or 0.0
        if total_expected > 0 or total_paid > 0:
            results.append({
                "id": t.id,
                "trainer_name": f"{user.first_name} {user.last_name}",
                "total_earned": total_expected,
                "total_paid": total_paid,
                "remaining_payout": total_expected - total_paid
            })
    return results

@router.get("/formation/{training_id}", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_training_detail_report(training_id: int, db: Session = Depends(get_db)):
    training = db.query(Training).filter(Training.id == training_id).first()
    if not training:
        return {"error": "Formation non trouvée"}
    
    enrollments = db.query(Enrollment).filter(Enrollment.training_id == training_id).all()
    total_revenue = sum(e.final_price for e in enrollments)
    total_paid = db.query(func.sum(StudentPayment.amount))\
        .join(Enrollment, Enrollment.id == StudentPayment.enrollment_id)\
        .filter(Enrollment.training_id == training_id).scalar() or 0.0
    
    assignments = db.query(TrainerAssignment).filter(TrainerAssignment.training_id == training_id).all()
    trainer_costs = 0.0
    trainer_details = []
    for a in assignments:
        calc = PaymentService.calculate_trainer_expected_payment(db, a.trainer_id, training_id)
        trainer_costs += calc["amount"]
        trainer_details.append({
            "trainer_id": a.trainer_id,
            "name": f"{a.trainer.user.first_name} {a.trainer.user.last_name}",
            "expected": calc["amount"],
            "mode": a.payment_mode
        })
    
    enrollment_details = []
    for e in enrollments:
        u = e.student.user
        total_paid_enrollment = db.query(func.sum(StudentPayment.amount)).filter(
            StudentPayment.enrollment_id == e.id
        ).scalar() or 0.0
        enrollment_details.append({
            "id": e.id,
            "student_id": e.student_id,
            "student_name": f"{u.first_name} {u.last_name}",
            "final_price": e.final_price,
            "total_paid": total_paid_enrollment,
            "balance": (e.final_price or 0) - total_paid_enrollment,
            "payment_mode": e.payment_mode,
            "discount_rate": e.discount_rate,
            "status": e.status,
        })
    
    return {
        "training": {
            "id": training.id,
            "title": training.title,
            "description": training.description,
            "price": training.price,
            "start_date": training.start_date,
            "end_date": training.end_date,
            "total_hours": training.total_hours,
            "masse_horaire": training.masse_horaire,
            "status": training.status,
        },
        "summary": {
            "total_enrollments": len(enrollments),
            "total_revenue": total_revenue,
            "total_paid": total_paid,
            "remaining": total_revenue - total_paid,
            "trainer_costs": trainer_costs,
            "net_margin": total_revenue - trainer_costs
        },
        "trainers": trainer_details,
        "enrollments": enrollment_details
    }

@router.get("/student/{student_id}", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_student_detail_report(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return {"error": "Étudiant non trouvé"}

    user = student.user
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.is_deleted == False
    ).all()
    payments = db.query(StudentPayment)\
        .join(Enrollment, Enrollment.id == StudentPayment.enrollment_id)\
        .filter(Enrollment.student_id == student_id)\
        .order_by(StudentPayment.date.desc()).all()
    
    total_invoiced = sum(e.final_price or 0 for e in enrollments)
    total_paid_sum = sum(p.amount or 0 for p in payments)

    enrollment_list = []
    for e in enrollments:
        training_title = e.training.title if e.training else None
        pack_name = e.pack.name if e.pack else None
        label = training_title or pack_name or f"Inscription #{e.id}"
        enrollment_list.append({
            "id": e.id,
            "training_id": e.training_id,
            "pack_id": e.pack_id,
            "training_title": training_title,
            "pack_name": pack_name,
            "label": label,
            "final_price": e.final_price,
            "discount_rate": e.discount_rate,
            "payment_mode": e.payment_mode,
            "monthly_amount": e.monthly_amount,
            "installment_count": e.installment_count,
            "status": e.status,
            "created_at": e.created_at,
        })

    payment_list = []
    for p in payments:
        payment_list.append({
            "id": p.id,
            "enrollment_id": p.enrollment_id,
            "amount": p.amount,
            "date": p.date,
            "payment_type": p.payment_type,
            "remaining_balance": p.remaining_balance,
            "notes": p.notes,
            "paid_by": p.paid_by,
        })

    return {
        "student": {
            "id": student.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "parent_phone": student.parent_phone,
            "specialty": student.specialty,
            "added_at": student.added_at or student.created_at,
        },
        "summary": {
            "total_invoiced": total_invoiced,
            "total_paid": total_paid_sum,
            "balance": total_invoiced - total_paid_sum
        },
        "enrollments": enrollment_list,
        "payments": payment_list
    }

@router.get("/trainer/{trainer_id}", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_trainer_detail_report(trainer_id: int, db: Session = Depends(get_db)):
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        return {"error": "Formateur non trouvé"}
    
    user = trainer.user
    assignments = db.query(TrainerAssignment).filter(TrainerAssignment.trainer_id == trainer_id).all()
    payments = db.query(TrainerPayment).filter(TrainerPayment.trainer_id == trainer_id).all()
    
    activities = []
    total_earned = 0.0
    for a in assignments:
        calc = PaymentService.calculate_trainer_expected_payment(db, trainer_id, a.training_id)
        total_earned += calc["amount"]
        activities.append({
            "training_id": a.training_id,
            "training_title": a.training.title,
            "earned": calc["amount"],
            "calculation": calc["details"]
        })
        
    total_paid = sum(p.amount for p in payments)
    
    return {
        "trainer": {
            "id": trainer.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "specialty": trainer.specialty,
            "level": trainer.level,
            "default_payment_mode": trainer.default_payment_mode,
            "hourly_rate": trainer.hourly_rate,
            "monthly_salary": trainer.monthly_salary,
            "price_per_student": trainer.price_per_student,
            "fixed_price_per_training": trainer.fixed_price_per_training,
        },
        "summary": {
            "total_earned": total_earned,
            "total_paid": total_paid,
            "balance": total_earned - total_paid
        },
        "activities": activities,
        "payments": [{
            "id": p.id,
            "amount": p.amount,
            "date": p.date,
            "payment_type": p.payment_type,
            "calculation_details": p.calculation_details,
        } for p in payments]
    }

@router.get("/pack/{pack_id}", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_pack_detail_report(pack_id: int, db: Session = Depends(get_db)):
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        return {"error": "Pack non trouvé"}
    
    enrollments = db.query(Enrollment).filter(Enrollment.pack_id == pack_id).all()
    total_revenue = sum(e.final_price for e in enrollments)
    
    enrollment_details = []
    for e in enrollments:
        u = e.student.user
        total_paid_e = db.query(func.sum(StudentPayment.amount)).filter(
            StudentPayment.enrollment_id == e.id
        ).scalar() or 0.0
        enrollment_details.append({
            "id": e.id,
            "student_id": e.student_id,
            "student_name": f"{u.first_name} {u.last_name}",
            "final_price": e.final_price,
            "total_paid": total_paid_e,
            "balance": (e.final_price or 0) - total_paid_e,
            "status": e.status,
        })
    
    return {
        "pack": {
            "id": pack.id,
            "name": pack.name,
            "description": pack.description,
            "discount_rate": pack.discount_rate,
            "created_at": pack.created_at,
        },
        "summary": {
            "enrollment_count": len(enrollments),
            "total_revenue": total_revenue
        },
        "trainings": [{
            "id": t.id,
            "title": t.title,
            "price": t.price,
            "status": t.status,
        } for t in pack.trainings],
        "enrollments": enrollment_details
    }

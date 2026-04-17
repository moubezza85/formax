from sqlalchemy.orm import Session
from ..models.models import Training, Pack, Enrollment, Student, Trainer, TrainerAssignment, Session as SessionModel, StudentPayment
from ..schemas.schemas import EnrollmentCreate
from typing import List

class PricingService:
    @staticmethod
    def calculate_enrollment_price(db: Session, enrollment_data: EnrollmentCreate) -> float:
        base_price = 0.0
        
        if enrollment_data.pack_id:
            pack = db.query(Pack).filter(Pack.id == enrollment_data.pack_id).first()
            if pack:
                # Sum of training prices * (1 - pack_discount)
                trainings_sum = sum(t.price for t in pack.trainings)
                base_price = trainings_sum * (1 - pack.discount_rate)
        elif enrollment_data.training_id:
            training = db.query(Training).filter(Training.id == enrollment_data.training_id).first()
            if training:
                base_price = training.price
        
        # Apply student-specific discount
        final_price = base_price * (1 - enrollment_data.discount_rate)
        return final_price

class PaymentService:
    @staticmethod
    def calculate_trainer_expected_payment(db: Session, trainer_id: int, training_id: int) -> dict:
        assignment = db.query(TrainerAssignment).filter(
            TrainerAssignment.trainer_id == trainer_id,
            TrainerAssignment.training_id == training_id
        ).first()
        
        trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
        
        mode = assignment.payment_mode if assignment and assignment.payment_mode else trainer.default_payment_mode
        rate = assignment.custom_rate if assignment and assignment.custom_rate else (
            trainer.hourly_rate if mode == "hourly" else 
            trainer.price_per_student if mode == "per_student" else 
            trainer.monthly_salary if mode == "monthly" else 0.0
        )
        
        amount = 0.0
        details = {"mode": mode, "rate": rate}

        if mode == "hourly":
            # Sum completed sessions
            sessions = db.query(SessionModel).filter(
                SessionModel.trainer_id == trainer_id,
                SessionModel.training_id == training_id,
                SessionModel.status == "completed"
            ).all()
            total_hours = sum(s.duration_hours for s in sessions)
            amount = total_hours * rate
            details["total_hours"] = total_hours
        
        elif mode == "per_student":
            student_count = db.query(Enrollment).filter(
                Enrollment.training_id == training_id,
                Enrollment.status == "active"
            ).count()
            amount = student_count * rate
            details["student_count"] = student_count
            
        elif mode == "fixed":
            amount = rate
            
        elif mode == "monthly":
            amount = rate # Simplified, typically handled by payroll service
            
        return {"amount": amount, "details": details}

from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.models import (
    Training, Pack, Enrollment, Student, Trainer,
    TrainerAssignment, Session as SessionModel,
    StudentPayment, TrainerPayment, TrainerPaymentMode
)
from ..schemas.schemas import EnrollmentCreate


class PricingService:
    @staticmethod
    def calculate_enrollment_price(
        db: Session, enrollment_data: EnrollmentCreate
    ) -> float:
        base_price = 0.0
        if enrollment_data.pack_id:
            pack = db.query(Pack).filter(Pack.id == enrollment_data.pack_id).first()
            if pack:
                trainings_sum = sum(t.price for t in pack.trainings)
                base_price = trainings_sum * (1 - pack.discount_rate)
        elif enrollment_data.training_id:
            training = db.query(Training).filter(
                Training.id == enrollment_data.training_id
            ).first()
            if training:
                base_price = training.price

        final_price = base_price * (1 - enrollment_data.discount_rate)
        return round(final_price, 2)


class PaymentService:
    @staticmethod
    def calculate_trainer_expected_payment(
        db: Session, trainer_id: int, training_id: int
    ) -> dict:
        assignment = db.query(TrainerAssignment).filter(
            TrainerAssignment.trainer_id == trainer_id,
            TrainerAssignment.training_id == training_id
        ).first()
        trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
        if not trainer:
            return {"amount": 0.0, "details": {}}

        mode = (
            assignment.payment_mode
            if assignment and assignment.payment_mode
            else trainer.default_payment_mode
        )

        if assignment and assignment.custom_rate is not None:
            rate = assignment.custom_rate
        else:
            mode_rates = {
                TrainerPaymentMode.HOURLY:      trainer.hourly_rate,
                TrainerPaymentMode.PER_STUDENT: trainer.price_per_student,
                TrainerPaymentMode.FIXED:       trainer.fixed_price_per_training,
                TrainerPaymentMode.MONTHLY:     trainer.monthly_salary,
            }
            rate = mode_rates.get(mode, 0.0)

        amount = 0.0
        details = {"mode": mode, "rate": rate}

        if mode == TrainerPaymentMode.HOURLY:
            sessions = db.query(SessionModel).filter(
                SessionModel.trainer_id == trainer_id,
                SessionModel.training_id == training_id,
                SessionModel.status == "completed"
            ).all()
            total_hours = sum(s.duration_hours for s in sessions) if sessions else 0.0
            amount = total_hours * rate
            details["total_hours"] = total_hours

        elif mode == TrainerPaymentMode.PER_STUDENT:
            student_count = db.query(Enrollment).filter(
                Enrollment.training_id == training_id,
                Enrollment.status == "active"
            ).count()
            amount = student_count * rate
            details["student_count"] = student_count

        elif mode == TrainerPaymentMode.FIXED:
            amount = rate

        elif mode == TrainerPaymentMode.MONTHLY:
            training = db.query(Training).filter(Training.id == training_id).first()
            nb_months = 1
            if training and training.start_date and training.end_date:
                delta = training.end_date - training.start_date
                nb_months = max(1, round(delta.days / 30))
            amount = rate * nb_months
            details["nb_months"] = nb_months

        return {"amount": round(amount, 2), "details": details}

    @staticmethod
    def get_student_balance(db: Session, enrollment_id: int) -> dict:
        enrollment = db.query(Enrollment).filter(
            Enrollment.id == enrollment_id
        ).first()
        if not enrollment:
            return {"total_paid": 0.0, "remaining": 0.0}
        total_paid = db.query(func.sum(StudentPayment.amount)).filter(
            StudentPayment.enrollment_id == enrollment_id
        ).scalar() or 0.0
        return {
            "total_paid": round(total_paid, 2),
            "remaining":  round((enrollment.final_price or 0) - total_paid, 2),
        }

    @staticmethod
    def get_trainer_balance(
        db: Session, trainer_id: int, training_id: int
    ) -> dict:
        expected = PaymentService.calculate_trainer_expected_payment(
            db, trainer_id, training_id
        )
        total_paid = db.query(func.sum(TrainerPayment.amount)).filter(
            TrainerPayment.trainer_id == trainer_id,
            TrainerPayment.training_id == training_id
        ).scalar() or 0.0
        return {
            "expected":   expected["amount"],
            "total_paid": round(total_paid, 2),
            "remaining":  round(expected["amount"] - total_paid, 2),
        }

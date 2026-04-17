from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.models import (
    Trainer, TrainerAssignment, TrainerPayment,
    Session as SessionModel, Enrollment, TrainerPaymentMode
)


class HonoraireCalculator:
    """
    Calcule les honoraires d'un formateur selon son mode de paiement
    configuré sur l'assignment (ou le mode par défaut du formateur).

    Modes supportés :
      - HOURLY      : nb_heures_réalisées × taux_horaire
      - PER_STUDENT : nb_étudiants_actifs × prix_par_étudiant
      - FIXED       : forfait fixe (custom_rate ou fixed_price_per_training)
      - MONTHLY     : mensualité × nb_mois_formation
    """

    def __init__(self, db: Session):
        self.db = db

    def calculate(self, trainer_id: int, training_id: int) -> dict:
        db = self.db

        trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
        if not trainer:
            return {"amount": 0.0, "mode": None, "details": {}, "error": "Formateur introuvable"}

        assignment = db.query(TrainerAssignment).filter(
            TrainerAssignment.trainer_id == trainer_id,
            TrainerAssignment.training_id == training_id
        ).first()

        mode = (
            assignment.payment_mode
            if assignment and assignment.payment_mode
            else trainer.default_payment_mode
        )

        rate = self._resolve_rate(trainer, assignment, mode)
        amount, details = self._compute(db, trainer_id, training_id, mode, rate)

        already_paid = db.query(func.sum(TrainerPayment.amount)).filter(
            TrainerPayment.trainer_id == trainer_id,
            TrainerPayment.training_id == training_id
        ).scalar() or 0.0

        return {
            "trainer_id": trainer_id,
            "training_id": training_id,
            "mode": mode,
            "rate": rate,
            "amount_due": round(amount, 2),
            "already_paid": round(already_paid, 2),
            "remaining": round(amount - already_paid, 2),
            "details": details,
        }

    def calculate_all_for_trainer(self, trainer_id: int) -> dict:
        """Calcule les honoraires totaux sur toutes les formations assignées."""
        assignments = self.db.query(TrainerAssignment).filter(
            TrainerAssignment.trainer_id == trainer_id
        ).all()

        total_due = 0.0
        total_paid = 0.0
        per_training = []

        for a in assignments:
            result = self.calculate(trainer_id, a.training_id)
            total_due += result["amount_due"]
            total_paid += result["already_paid"]
            per_training.append({
                "training_id": a.training_id,
                "training_title": a.training.title if a.training else None,
                **result,
            })

        return {
            "trainer_id": trainer_id,
            "total_due": round(total_due, 2),
            "total_paid": round(total_paid, 2),
            "total_remaining": round(total_due - total_paid, 2),
            "per_training": per_training,
        }

    # ── Helpers privés ────────────────────────────────────────────────────────

    def _resolve_rate(self, trainer, assignment, mode) -> float:
        if assignment and assignment.custom_rate is not None:
            return assignment.custom_rate
        mapping = {
            TrainerPaymentMode.HOURLY:      trainer.hourly_rate,
            TrainerPaymentMode.PER_STUDENT: trainer.price_per_student,
            TrainerPaymentMode.FIXED:       trainer.fixed_price_per_training,
            TrainerPaymentMode.MONTHLY:     trainer.monthly_salary,
        }
        return mapping.get(mode, 0.0) or 0.0

    def _compute(self, db, trainer_id, training_id, mode, rate):
        details = {}

        if mode == TrainerPaymentMode.HOURLY:
            sessions = db.query(SessionModel).filter(
                SessionModel.trainer_id == trainer_id,
                SessionModel.training_id == training_id,
                SessionModel.status == "completed"
            ).all()
            total_hours = sum(
                (((s.end_time - s.start_time).seconds / 3600) if s.start_time and s.end_time
                 else (s.duration_hours or 0.0))
                for s in sessions
            )
            amount = total_hours * rate
            details = {"total_hours": round(total_hours, 2), "rate_per_hour": rate}

        elif mode == TrainerPaymentMode.PER_STUDENT:
            count = db.query(Enrollment).filter(
                Enrollment.training_id == training_id,
                Enrollment.status == "active"
            ).count()
            amount = count * rate
            details = {"student_count": count, "rate_per_student": rate}

        elif mode == TrainerPaymentMode.FIXED:
            amount = rate
            details = {"forfait": rate}

        elif mode == TrainerPaymentMode.MONTHLY:
            from ..models.models import Training
            training = db.query(Training).filter(Training.id == training_id).first()
            nb_months = 1
            if training and training.start_date and training.end_date:
                nb_months = max(1, round((training.end_date - training.start_date).days / 30))
            amount = rate * nb_months
            details = {"monthly_rate": rate, "nb_months": nb_months}

        else:
            amount = 0.0

        return amount, details

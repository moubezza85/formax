from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from passlib.context import CryptContext

from ..database import get_db
from ..models.models import (
    User, Trainer, Student, Training, Enrollment, TrainerAssignment,
    WizardDraft, UserRole
)
from ..schemas.schemas import (
    WizardDraftCreate, WizardDraftUpdate, WizardDraftOut,
    WizardLaunchPayload, EnrollmentCreate, TrainingCreate
)
from ..api.deps import get_current_user, check_role
from ..services.business_logic import PricingService

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Brouillons ────────────────────────────────────────────────────────────────

@router.get("/drafts", response_model=List[WizardDraftOut])
def list_drafts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(WizardDraft)
        .filter(WizardDraft.user_id == current_user.id, WizardDraft.is_deleted == False)
        .order_by(WizardDraft.updated_at.desc())
        .all()
    )

@router.post("/drafts", response_model=WizardDraftOut)
def create_draft(
    draft_in: WizardDraftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    draft = WizardDraft(
        user_id=current_user.id,
        name=draft_in.name,
        current_step=draft_in.current_step,
        data_json=draft_in.data_json,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft

@router.put("/drafts/{draft_id}", response_model=WizardDraftOut)
def update_draft(
    draft_id: int,
    draft_in: WizardDraftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    draft = db.query(WizardDraft).filter(
        WizardDraft.id == draft_id,
        WizardDraft.user_id == current_user.id,
        WizardDraft.is_deleted == False
    ).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Brouillon introuvable")
    if draft_in.name is not None:
        draft.name = draft_in.name
    if draft_in.current_step is not None:
        draft.current_step = draft_in.current_step
    if draft_in.data_json is not None:
        draft.data_json = draft_in.data_json
    db.commit()
    db.refresh(draft)
    return draft

@router.delete("/drafts/{draft_id}")
def delete_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    draft = db.query(WizardDraft).filter(
        WizardDraft.id == draft_id,
        WizardDraft.user_id == current_user.id
    ).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Brouillon introuvable")
    draft.is_deleted = True
    draft.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Brouillon supprime"}


# ── Recherche formateurs (Etape 2) ────────────────────────────────────────────

@router.get("/step2/trainers/search")
def search_trainers(q: str = "", db: Session = Depends(get_db)):
    query = (
        db.query(Trainer, User)
        .join(User, Trainer.user_id == User.id)
        .filter(Trainer.is_deleted == False, User.is_deleted == False)
    )
    if q:
        like = f"%{q}%"
        query = query.filter(
            (User.first_name.ilike(like)) | (User.last_name.ilike(like)) |
            (User.email.ilike(like)) | (Trainer.specialty.ilike(like))
        )
    results = query.limit(20).all()
    return [
        {
            "id": t.id,
            "user_id": u.id,
            "name": f"{u.first_name} {u.last_name}",
            "email": u.email,
            "specialty": t.specialty,
            "level": t.level,
            "default_payment_mode": t.default_payment_mode,
            "hourly_rate": t.hourly_rate,
            "monthly_salary": t.monthly_salary,
            "price_per_student": t.price_per_student,
            "fixed_price_per_training": t.fixed_price_per_training,
        }
        for t, u in results
    ]


# ── Recherche etudiants (Etape 3) ─────────────────────────────────────────────

@router.get("/step3/students/search")
def search_students(q: str = "", db: Session = Depends(get_db)):
    query = (
        db.query(Student, User)
        .join(User, Student.user_id == User.id)
        .filter(Student.is_deleted == False, User.is_deleted == False)
    )
    if q:
        like = f"%{q}%"
        query = query.filter(
            (User.first_name.ilike(like)) | (User.last_name.ilike(like)) |
            (User.email.ilike(like)) | (User.phone.ilike(like))
        )
    results = query.limit(20).all()
    return [
        {
            "id": s.id,
            "user_id": u.id,
            "name": f"{u.first_name} {u.last_name}",
            "email": u.email,
            "phone": u.phone,
            "parent_phone": s.parent_phone,
            "specialty": s.specialty,
            "added_at": s.added_at,
        }
        for s, u in results
    ]


# ── Preview recap sans commit (Etape 5 preview) ───────────────────────────────

@router.post("/preview", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def wizard_preview(payload: WizardLaunchPayload, db: Session = Depends(get_db)):
    training_info = {}
    base_price = 0.0

    if payload.training_id:
        t = db.query(Training).filter(
            Training.id == payload.training_id, Training.is_deleted == False
        ).first()
        if t:
            training_info = {"id": t.id, "title": t.title, "price": t.price}
            base_price = t.price
    elif payload.training_data:
        td = payload.training_data
        training_info = {"title": td.title, "price": td.price}
        base_price = td.price

    students_preview = []
    for entry in payload.students:
        final_price = round(base_price * (1 - entry.discount_rate), 2)
        students_preview.append({
            "student_id": entry.student_id,
            "discount_rate": entry.discount_rate,
            "final_price": final_price,
            "payment_mode": entry.payment_mode,
        })

    total_revenue = sum(s["final_price"] for s in students_preview)
    return {
        "training": training_info,
        "trainers_count": len(payload.trainers),
        "students": students_preview,
        "total_revenue": round(total_revenue, 2),
    }


# ── Lancement definitif ───────────────────────────────────────────────────────

@router.post("/launch", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def wizard_launch(payload: WizardLaunchPayload, db: Session = Depends(get_db)):
    # 1. Formation
    if payload.training_id:
        training = db.query(Training).filter(
            Training.id == payload.training_id, Training.is_deleted == False
        ).first()
        if not training:
            raise HTTPException(status_code=404, detail="Formation introuvable")
    elif payload.training_data:
        td = payload.training_data
        training = Training(
            title=td.title, description=td.description, price=td.price,
            start_date=td.start_date, end_date=td.end_date,
            total_hours=td.total_hours, masse_horaire=td.masse_horaire,
            status="active"
        )
        db.add(training)
        db.flush()
    else:
        raise HTTPException(status_code=400, detail="Formation requise (id ou donnees)")

    training.status = "active"

    # 2. Formateurs + Assignments
    created_assignments = []
    for entry in payload.trainers:
        if entry.trainer_id:
            trainer = db.query(Trainer).filter(
                Trainer.id == entry.trainer_id, Trainer.is_deleted == False
            ).first()
            if not trainer:
                raise HTTPException(status_code=404, detail=f"Formateur {entry.trainer_id} introuvable")
        elif entry.trainer_data:
            td = entry.trainer_data
            new_user = User(
                email=td.email,
                password_hash=pwd_ctx.hash(td.password or "changeme"),
                first_name=td.first_name,
                last_name=td.last_name,
                phone=td.phone,
                role=UserRole.TRAINER,
            )
            db.add(new_user)
            db.flush()
            trainer = Trainer(
                user_id=new_user.id,
                specialty=td.specialty,
                level=td.level,
                default_payment_mode=td.default_payment_mode,
                hourly_rate=td.hourly_rate,
                monthly_salary=td.monthly_salary,
                price_per_student=td.price_per_student,
                fixed_price_per_training=td.fixed_price,
            )
            db.add(trainer)
            db.flush()
        else:
            continue

        assignment = TrainerAssignment(
            trainer_id=trainer.id,
            training_id=training.id,
            is_primary=entry.is_primary,
            payment_mode=entry.payment_mode,
            custom_rate=entry.custom_rate,
            assigned_hours=entry.assigned_hours,
        )
        db.add(assignment)
        db.flush()
        created_assignments.append({
            "trainer_id": trainer.id,
            "assignment_id": assignment.id
        })

    # 3. Etudiants + Inscriptions
    created_enrollments = []
    for entry in payload.students:
        if entry.student_id:
            student = db.query(Student).filter(
                Student.id == entry.student_id, Student.is_deleted == False
            ).first()
            if not student:
                raise HTTPException(status_code=404, detail=f"Etudiant {entry.student_id} introuvable")
        elif entry.student_data:
            sd = entry.student_data
            new_user = User(
                email=sd.email,
                password_hash=pwd_ctx.hash(sd.password or "changeme"),
                first_name=sd.first_name,
                last_name=sd.last_name,
                phone=sd.phone,
                role=UserRole.STUDENT,
            )
            db.add(new_user)
            db.flush()
            student = Student(
                user_id=new_user.id,
                specialty=sd.specialty,
                parent_phone=sd.parent_phone
            )
            db.add(student)
            db.flush()
        else:
            continue

        enroll_in = EnrollmentCreate(
            student_id=student.id,
            training_id=training.id,
            discount_rate=entry.discount_rate,
            payment_mode=entry.payment_mode,
            monthly_amount=entry.monthly_amount,
            installment_count=entry.installment_count,
            installment_amount=entry.installment_amount,
        )
        final_price = PricingService.calculate_enrollment_price(db, enroll_in)

        enrollment = Enrollment(
            student_id=student.id,
            training_id=training.id,
            discount_rate=entry.discount_rate,
            final_price=final_price,
            payment_mode=entry.payment_mode,
            monthly_amount=entry.monthly_amount,
            installment_count=entry.installment_count,
        )
        db.add(enrollment)
        db.flush()
        created_enrollments.append({
            "student_id": student.id,
            "enrollment_id": enrollment.id,
            "final_price": final_price
        })

    db.commit()
    return {
        "success": True,
        "training_id": training.id,
        "title": training.title,
        "assignments": created_assignments,
        "enrollments": created_enrollments,
        "message": f"Formation '{training.title}' lancee avec {len(created_assignments)} formateur(s) et {len(created_enrollments)} etudiant(s).",
    }

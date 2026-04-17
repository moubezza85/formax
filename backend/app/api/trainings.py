from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from ..models.models import Training, Pack, Enrollment, UserRole
from ..schemas.schemas import TrainingCreate, TrainingOut, EnrollmentCreate, EnrollmentOut, TrainingUpdate
from ..api.deps import check_role
from ..services.business_logic import PricingService

router = APIRouter()

@router.get("/", response_model=List[TrainingOut])
def list_trainings(db: Session = Depends(get_db)):
    return db.query(Training).filter(Training.is_deleted == False).all()

@router.post("/", response_model=TrainingOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def create_training(training_in: TrainingCreate, db: Session = Depends(get_db)):
    db_training = Training(**training_in.dict())
    db.add(db_training)
    db.commit()
    db.refresh(db_training)
    return db_training

@router.patch("/{training_id}", response_model=TrainingOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_training(training_id: int, training_in: TrainingUpdate, db: Session = Depends(get_db)):
    db_training = db.query(Training).filter(Training.id == training_id).first()
    if not db_training:
        raise HTTPException(status_code=404, detail="Formation non trouvée")
    
    update_data = training_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_training, field, value)
    
    db.commit()
    db.refresh(db_training)
    return db_training

@router.delete("/{training_id}", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def delete_training(training_id: int, db: Session = Depends(get_db)):
    db_training = db.query(Training).filter(Training.id == training_id).first()
    if not db_training:
        raise HTTPException(status_code=404, detail="Formation non trouvée")
    
    db_training.is_deleted = True
    db_training.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Formation supprimée (soft delete)"}

@router.post("/launch", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def launch_training(data: dict, db: Session = Depends(get_db)):
    """
    Launch a training from wizard data.
    data structure:
    {
        training: { id: int or None, title, description, price, masse_horaire, start_date, end_date },
        trainers: [ { id: int or None, first_name, last_name, email, payment_mode, rate, is_primary } ],
        students: [ { id: int or None, first_name, last_name, email, discount, payment_mode, upfront } ]
    }
    """
    try:
        # 1. Handle Training
        t_data = data.get("training", {})
        if t_data.get("id"):
            training = db.query(Training).filter(Training.id == t_data["id"]).first()
        else:
            training = Training(
                title=t_data["title"],
                description=t_data.get("description"),
                price=t_data["price"],
                masse_horaire=t_data.get("masse_horaire"),
                status="active"
            )
            db.add(training)
            db.flush() # Get ID

        # 2. Handle Trainers
        for tr in data.get("trainers", []):
            if tr.get("id"):
                trainer_id = tr["id"]
            else:
                # Create NEW Trainer (User + Profile)
                new_user = User(
                    email=tr["email"],
                    first_name=tr["first_name"],
                    last_name=tr["last_name"],
                    password_hash="hashed_default_password", # Should be changed
                    role=UserRole.TRAINER
                )
                db.add(new_user)
                db.flush()
                new_trainer = Trainer(user_id=new_user.id, specialty="TBD")
                db.add(new_trainer)
                db.flush()
                trainer_id = new_trainer.id
            
            # Assignment
            assignment = TrainerAssignment(
                trainer_id=trainer_id,
                training_id=training.id,
                payment_mode=tr["payment_mode"],
                custom_rate=tr["rate"],
                is_primary=tr.get("is_primary", False)
            )
            db.add(assignment)

        # 3. Handle Students
        for st in data.get("students", []):
            if st.get("id"):
                student_id = st["id"]
            else:
                # Create NEW Student (User + Profile)
                new_user = User(
                    email=st["email"],
                    first_name=st["first_name"],
                    last_name=st["last_name"],
                    password_hash="hashed_default_password",
                    role=UserRole.STUDENT
                )
                db.add(new_user)
                db.flush()
                new_student = Student(user_id=new_user.id)
                db.add(new_student)
                db.flush()
                student_id = new_student.id
            
            # Calculation
            final_price = training.price * (1 - (st.get("discount", 0) / 100))
            
            # Enrollment
            enrollment = Enrollment(
                student_id=student_id,
                training_id=training.id,
                discount_rate=st.get("discount", 0) / 100,
                final_price=final_price,
                payment_mode=st.get("payment_mode", "full"),
                monthly_amount=st.get("monthly_amount"),
                installment_count=st.get("installment_count"),
                status="active"
            )
            db.add(enrollment)
            db.flush()

            # Record upfront payment if any
            if st.get("upfront", 0) > 0:
                payment = StudentPayment(
                    enrollment_id=enrollment.id,
                    amount=st["upfront"],
                    payment_type=st.get("payment_mode", "full"),
                    remaining_balance=final_price - st["upfront"],
                    notes="Acompte initial au lancement"
                )
                db.add(payment)

        db.commit()
        return {"message": "Formation lancée avec succès", "training_id": training.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

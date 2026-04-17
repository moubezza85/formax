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

@router.post("/enroll", response_model=EnrollmentOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def enroll_student(enrollment_in: EnrollmentCreate, db: Session = Depends(get_db)):
    final_price = PricingService.calculate_enrollment_price(db, enrollment_in)
    
    db_enrollment = Enrollment(
        student_id=enrollment_in.student_id,
        training_id=enrollment_in.training_id,
        pack_id=enrollment_in.pack_id,
        discount_rate=enrollment_in.discount_rate,
        final_price=final_price,
        status="active"
    )
    db.add(db_enrollment)
    db.commit()
    db.refresh(db_enrollment)
    return db_enrollment

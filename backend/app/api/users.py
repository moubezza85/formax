from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from ..models.models import Student, Trainer, User, UserRole
from ..schemas.schemas import UserOut, UserCreate, UserUpdate
from ..api.deps import check_role
from ..core import security

router = APIRouter()

@router.get("/students", response_model=List[UserOut])
def list_students(db: Session = Depends(get_db)):
    return db.query(User).join(Student).filter(User.is_deleted == False).all()

@router.get("/trainers", response_model=List[UserOut])
def list_trainers(db: Session = Depends(get_db)):
    return db.query(User).join(Trainer).filter(User.is_deleted == False).all()

@router.post("/students", response_model=UserOut)
def create_student(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    db_user = User(
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        role=UserRole.STUDENT
    )
    db.add(db_user)
    db.flush()
    
    student = Student(user_id=db_user.id)
    db.add(student)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/trainers", response_model=UserOut)
def create_trainer(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    db_user = User(
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        role=UserRole.TRAINER
    )
    db.add(db_user)
    db.flush()
    
    trainer = Trainer(user_id=db_user.id)
    db.add(trainer)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    update_data = user_in.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = security.get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    db_user.is_deleted = True
    db_user.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Utilisateur supprimé (soft delete)"}

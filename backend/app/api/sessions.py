from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from ..database import get_db
from ..models.models import Session as SessionModel, UserRole, Training, Trainer, User
from ..schemas.schemas import SessionCreate, SessionOut
from ..api.deps import check_role

router = APIRouter()

@router.get("/", response_model=List[SessionOut])
def list_sessions(db: Session = Depends(get_db)):
    # Global list with training and trainer info
    sessions = db.query(SessionModel).join(Training).join(Trainer).join(User, Trainer.user_id == User.id).all()
    
    results = []
    for s in sessions:
        results.append({
            "id": s.id,
            "training_id": s.training_id,
            "training_title": s.training.title,
            "trainer_id": s.trainer_id,
            "trainer_name": f"{s.trainer.user.first_name} {s.trainer.user.last_name}",
            "date": s.date,
            "duration_hours": s.duration_hours,
            "room": s.room,
            "status": s.status
        })
    return results

@router.get("/rooms", response_model=List[str])
def list_rooms(db: Session = Depends(get_db)):
    rooms = db.query(SessionModel.room).filter(SessionModel.room != None).distinct().all()
    return [r[0] for r in rooms if r[0]]

@router.get("/training/{training_id}", response_model=List[SessionOut])
def get_training_sessions(training_id: int, db: Session = Depends(get_db)):
    sessions = db.query(SessionModel).join(Training).join(Trainer).join(User, Trainer.user_id == User.id).filter(SessionModel.training_id == training_id).all()
    results = []
    for s in sessions:
        results.append({
            "id": s.id,
            "training_id": s.training_id,
            "training_title": s.training.title,
            "trainer_id": s.trainer_id,
            "trainer_name": f"{s.trainer.user.first_name} {s.trainer.user.last_name}",
            "date": s.date,
            "duration_hours": s.duration_hours,
            "room": s.room,
            "status": s.status
        })
    return results

@router.post("/", response_model=SessionOut, dependencies=[Depends(check_role([UserRole.ADMIN, UserRole.TRAINER]))])
def create_session(session_in: SessionCreate, db: Session = Depends(get_db)):
    db_session = SessionModel(**session_in.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.patch("/{session_id}/complete", response_model=SessionOut)
def complete_session(session_id: int, db: Session = Depends(get_db)):
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    db_session.status = "completed"
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/progress/{training_id}")
def get_training_progress(training_id: int, db: Session = Depends(get_db)):
    training = db.query(Training).filter(Training.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Formation non trouvée")
    
    completed_hours = db.query(SessionModel).filter(
        SessionModel.training_id == training_id,
        SessionModel.status == "completed"
    ).with_entities(func.sum(SessionModel.duration_hours)).scalar() or 0.0
    
    return {
        "training_title": training.title,
        "planned_hours": training.total_hours,
        "completed_hours": completed_hours,
        "progress_percent": (completed_hours / training.total_hours * 100) if training.total_hours > 0 else 0
    }

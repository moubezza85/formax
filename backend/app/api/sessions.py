from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel
from ..database import get_db
from ..models.models import Session as SessionModel, Room, Training, Trainer, User, UserRole
from ..schemas.schemas import SessionCreate, SessionOut
from ..api.deps import check_role

router = APIRouter()

# ─── Schemas ───────────────────────────────────
class SessionPlanCreate(BaseModel):
    training_id: int
    trainer_id: int
    room_id: int
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None

class SessionPlanUpdate(BaseModel):
    room_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class SessionPlanOut(BaseModel):
    id: int
    training_id: int
    training_title: str
    training_color: Optional[str] = None
    trainer_id: int
    trainer_name: str
    room_id: Optional[int]
    room_name: Optional[str]
    room_color: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    duration_hours: Optional[float]
    notes: Optional[str]
    status: str

    class Config:
        from_attributes = True

# ─── Helpers ───────────────────────────────────

def _check_conflict(db: Session, room_id: int, start_time: datetime, end_time: datetime, exclude_id: int = None):
    """
    Détecte tout chevauchement pour une salle donnée.
    Chevauchement si : start_existing < end_new AND end_existing > start_new
    """
    q = db.query(SessionModel).filter(
        SessionModel.room_id == room_id,
        SessionModel.is_deleted == False,
        SessionModel.status != "cancelled",
        SessionModel.start_time < end_time,
        SessionModel.end_time > start_time,
    )
    if exclude_id:
        q = q.filter(SessionModel.id != exclude_id)
    return q.first()


def _serialize(s: SessionModel) -> dict:
    duration = None
    if s.start_time and s.end_time:
        duration = (s.end_time - s.start_time).total_seconds() / 3600
    return {
        "id": s.id,
        "training_id": s.training_id,
        "training_title": s.training.title if s.training else "",
        "training_color": None,
        "trainer_id": s.trainer_id,
        "trainer_name": (
            f"{s.trainer.user.first_name} {s.trainer.user.last_name}"
            if s.trainer and s.trainer.user else ""
        ),
        "room_id": s.room_id,
        "room_name": s.room_obj.name if s.room_obj else s.room,
        "room_color": s.room_obj.color if s.room_obj else None,
        "start_time": s.start_time,
        "end_time": s.end_time,
        "duration_hours": duration or s.duration_hours,
        "notes": s.notes,
        "status": s.status,
    }


# ─── Routes ────────────────────────────────────

@router.get("/", response_model=List[SessionOut])
def list_sessions(
    date_str: Optional[str] = Query(None, alias="date"),
    week_start: Optional[str] = None,
    room_id: Optional[int] = None,
    training_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    q = db.query(SessionModel).filter(SessionModel.is_deleted == False)

    if date_str:
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
            day_start = datetime(d.year, d.month, d.day, 0, 0, 0)
            day_end   = datetime(d.year, d.month, d.day, 23, 59, 59)
            q = q.filter(
                SessionModel.start_time >= day_start,
                SessionModel.start_time <= day_end
            )
        except ValueError:
            pass

    if week_start:
        try:
            ws = datetime.strptime(week_start, "%Y-%m-%d")
            from datetime import timedelta
            we = ws + timedelta(days=6, hours=23, minutes=59)
            q = q.filter(SessionModel.start_time >= ws, SessionModel.start_time <= we)
        except ValueError:
            pass

    if room_id:
        q = q.filter(SessionModel.room_id == room_id)
    if training_id:
        q = q.filter(SessionModel.training_id == training_id)

    sessions = q.order_by(SessionModel.start_time).all()
    results = []
    for s in sessions:
        try:
            results.append(_serialize(s))
        except Exception:
            pass
    return results


@router.get("/rooms", response_model=List[str])
def list_room_names(db: Session = Depends(get_db)):
    """Legacy endpoint — retourne noms distincts pour compatibilité."""
    rooms = db.query(Room).filter(Room.is_deleted == False, Room.is_active == True).order_by(Room.name).all()
    if rooms:
        return [r.name for r in rooms]
    legacy = db.query(SessionModel.room).filter(SessionModel.room != None).distinct().all()
    return [r[0] for r in legacy if r[0]]


@router.get("/planning", response_model=List[SessionPlanOut])
def planning(
    date_str: Optional[str] = Query(None, alias="date"),
    week_start: Optional[str] = None,
    room_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Endpoint dédié au planning avec toutes les infos de salle/formation."""
    q = db.query(SessionModel).filter(
        SessionModel.is_deleted == False,
        SessionModel.start_time.isnot(None)
    )

    if date_str:
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
            day_start = datetime(d.year, d.month, d.day, 0, 0, 0)
            day_end   = datetime(d.year, d.month, d.day, 23, 59, 59)
            q = q.filter(SessionModel.start_time >= day_start, SessionModel.start_time <= day_end)
        except ValueError:
            pass

    if week_start:
        try:
            ws = datetime.strptime(week_start, "%Y-%m-%d")
            from datetime import timedelta
            we = ws + timedelta(days=6, hours=23, minutes=59)
            q = q.filter(SessionModel.start_time >= ws, SessionModel.start_time <= we)
        except ValueError:
            pass

    if room_id:
        q = q.filter(SessionModel.room_id == room_id)

    sessions = q.order_by(SessionModel.start_time).all()
    return [_serialize(s) for s in sessions]


@router.post("/plan", response_model=SessionPlanOut,
             dependencies=[Depends(check_role([UserRole.ADMIN]))])
def create_planned_session(data: SessionPlanCreate, db: Session = Depends(get_db)):
    # Vérif salle
    room = db.query(Room).filter(Room.id == data.room_id, Room.is_deleted == False, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Salle introuvable ou inactive.")

    # Vérif dates
    if data.end_time <= data.start_time:
        raise HTTPException(status_code=400, detail="L'heure de fin doit être après l'heure de début.")

    # Détection conflit
    conflict = _check_conflict(db, data.room_id, data.start_time, data.end_time)
    if conflict:
        conflict_start = conflict.start_time.strftime("%H:%M") if conflict.start_time else "?"
        conflict_end   = conflict.end_time.strftime("%H:%M")   if conflict.end_time   else "?"
        raise HTTPException(
            status_code=409,
            detail=f"Conflit : la salle '{room.name}' est déjà occupée de {conflict_start} à {conflict_end}."
        )

    duration = (data.end_time - data.start_time).total_seconds() / 3600
    session = SessionModel(
        training_id=data.training_id,
        trainer_id=data.trainer_id,
        room_id=data.room_id,
        room=room.name,
        start_time=data.start_time,
        end_time=data.end_time,
        date=data.start_time,
        duration_hours=duration,
        notes=data.notes,
        status="planned",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _serialize(session)


@router.patch("/plan/{session_id}", response_model=SessionPlanOut,
              dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_planned_session(session_id: int, data: SessionPlanUpdate, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id, SessionModel.is_deleted == False
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Séance introuvable.")

    new_room_id    = data.room_id    or session.room_id
    new_start_time = data.start_time or session.start_time
    new_end_time   = data.end_time   or session.end_time

    if new_end_time and new_start_time and new_end_time <= new_start_time:
        raise HTTPException(status_code=400, detail="L'heure de fin doit être après l'heure de début.")

    if new_room_id and new_start_time and new_end_time:
        conflict = _check_conflict(db, new_room_id, new_start_time, new_end_time, exclude_id=session_id)
        if conflict:
            cs = conflict.start_time.strftime("%H:%M") if conflict.start_time else "?"
            ce = conflict.end_time.strftime("%H:%M")   if conflict.end_time   else "?"
            raise HTTPException(
                status_code=409,
                detail=f"Conflit : salle déjà occupée de {cs} à {ce}."
            )

    for field, value in data.dict(exclude_unset=True).items():
        setattr(session, field, value)

    if session.start_time and session.end_time:
        session.duration_hours = (session.end_time - session.start_time).total_seconds() / 3600
        session.date = session.start_time

    db.commit()
    db.refresh(session)
    return _serialize(session)


@router.delete("/plan/{session_id}",
               dependencies=[Depends(check_role([UserRole.ADMIN]))])
def cancel_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id, SessionModel.is_deleted == False
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Séance introuvable.")
    session.status = "cancelled"
    db.commit()
    return {"detail": "Séance annulée."}


@router.get("/training/{training_id}", response_model=List[SessionOut])
def get_training_sessions(training_id: int, db: Session = Depends(get_db)):
    sessions = (
        db.query(SessionModel)
        .filter(SessionModel.training_id == training_id, SessionModel.is_deleted == False)
        .order_by(SessionModel.start_time)
        .all()
    )
    return [_serialize(s) for s in sessions]


@router.post("/", response_model=SessionOut,
             dependencies=[Depends(check_role([UserRole.ADMIN, UserRole.TRAINER]))])
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
    completed_hours = (
        db.query(SessionModel)
        .filter(SessionModel.training_id == training_id, SessionModel.status == "completed")
        .with_entities(func.sum(SessionModel.duration_hours))
        .scalar() or 0.0
    )
    return {
        "training_title": training.title,
        "planned_hours": training.total_hours,
        "completed_hours": completed_hours,
        "progress_percent": (
            completed_hours / training.total_hours * 100 if training.total_hours else 0
        ),
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime, timedelta
from collections import defaultdict
from ..database import get_db
from ..models.models import Room, UserRole, Session as SessionModel
from ..api.deps import check_role

router = APIRouter()

# ─── Schemas ───────────────────────────────────
class RoomCreate(BaseModel):
    name: str
    capacity: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = "#4f98a3"

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class RoomOut(BaseModel):
    id: int
    name: str
    capacity: Optional[int]
    description: Optional[str]
    color: str
    is_active: bool

    class Config:
        from_attributes = True

# ─── Routes CRUD ────────────────────────────────

@router.get("/", response_model=List[RoomOut])
def list_rooms(active_only: bool = True, db: DBSession = Depends(get_db)):
    q = db.query(Room).filter(Room.is_deleted == False)
    if active_only:
        q = q.filter(Room.is_active == True)
    return q.order_by(Room.name).all()


@router.post("/", response_model=RoomOut,
             dependencies=[Depends(check_role([UserRole.ADMIN]))])
def create_room(data: RoomCreate, db: DBSession = Depends(get_db)):
    existing = db.query(Room).filter(Room.name == data.name, Room.is_deleted == False).first()
    if existing:
        raise HTTPException(status_code=400, detail="Une salle avec ce nom existe déjà.")
    room = Room(**data.dict())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.patch("/{room_id}", response_model=RoomOut,
              dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_room(room_id: int, data: RoomUpdate, db: DBSession = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id, Room.is_deleted == False).first()
    if not room:
        raise HTTPException(status_code=404, detail="Salle introuvable.")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(room, field, value)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}",
               dependencies=[Depends(check_role([UserRole.ADMIN]))])
def delete_room(room_id: int, db: DBSession = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id, Room.is_deleted == False).first()
    if not room:
        raise HTTPException(status_code=404, detail="Salle introuvable.")
    room.is_deleted = True
    room.is_active = False
    db.commit()
    return {"detail": "Salle supprimée."}


# ─── Stats Routes (Phase 3) ─────────────────────

@router.get("/stats/occupation")
def get_occupation_stats(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: DBSession = Depends(get_db)
):
    """
    Taux d'occupation par salle sur une période.
    Par défaut : les 30 derniers jours.
    """
    if not date_from:
        date_from = date.today() - timedelta(days=30)
    if not date_to:
        date_to = date.today()

    dt_from = datetime.combine(date_from, datetime.min.time())
    dt_to   = datetime.combine(date_to,   datetime.max.time())

    rooms = db.query(Room).filter(Room.is_deleted == False, Room.is_active == True).all()
    result = []

    for room in rooms:
        sessions = db.query(SessionModel).filter(
            SessionModel.room_id == room.id,
            SessionModel.is_deleted == False,
            SessionModel.status != "cancelled",
            SessionModel.start_time >= dt_from,
            SessionModel.start_time <= dt_to,
        ).all()

        total_sessions = len(sessions)
        days_range = (date_to - date_from).days + 1
        capacity = room.capacity or 0

        result.append({
            "room_id": room.id,
            "room_name": room.name,
            "room_color": room.color,
            "capacity": capacity,
            "total_sessions": total_sessions,
            "days_range": days_range,
            "occupation_rate": round((total_sessions / days_range) * 100, 1) if days_range > 0 else 0,
            "over_capacity_count": 0,
        })

    return {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "rooms": result
    }


@router.get("/stats/week-consolidated")
def get_week_consolidated(
    week_start: Optional[date] = None,
    db: DBSession = Depends(get_db)
):
    """
    Vue semaine consolidée : toutes les salles x tous les jours.
    week_start = lundi de la semaine. Défaut : lundi courant.
    """
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

    week_end = week_start + timedelta(days=6)
    dt_from  = datetime.combine(week_start, datetime.min.time())
    dt_to    = datetime.combine(week_end,   datetime.max.time())

    rooms = db.query(Room).filter(
        Room.is_deleted == False,
        Room.is_active == True
    ).order_by(Room.name).all()

    sessions_in_week = db.query(SessionModel).filter(
        SessionModel.is_deleted == False,
        SessionModel.status != "cancelled",
        SessionModel.start_time >= dt_from,
        SessionModel.start_time <= dt_to,
    ).all()

    # Index par (room_id, date_str)
    sessions_map = defaultdict(list)
    for s in sessions_in_week:
        if s.start_time:
            day_str = s.start_time.date().isoformat()
            sessions_map[(s.room_id, day_str)].append(s)

    days = [week_start + timedelta(days=i) for i in range(7)]

    grid = []
    for room in rooms:
        row = {
            "room_id": room.id,
            "room_name": room.name,
            "room_color": room.color,
            "capacity": room.capacity,
            "days": {}
        }
        for day in days:
            day_str = day.isoformat()
            day_sessions = sessions_map.get((room.id, day_str), [])
            row["days"][day_str] = {
                "sessions": [
                    {
                        "id": s.id,
                        "time_start": s.start_time.strftime("%H:%M") if s.start_time else None,
                        "time_end":   s.end_time.strftime("%H:%M")   if s.end_time   else None,
                        "training_name": s.training.title if s.training else None,
                        "status": s.status,
                    }
                    for s in day_sessions
                ],
                "session_count": len(day_sessions),
                "over_capacity": False,
            }
        grid.append(row)

    return {
        "week_start": str(week_start),
        "week_end":   str(week_end),
        "days":       [d.isoformat() for d in days],
        "grid":       grid
    }

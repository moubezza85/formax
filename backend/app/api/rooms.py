from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, timedelta
from ..database import get_db
from ..models.models import Room, UserRole, PlannedSession
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

# ─── Routes ────────────────────────────────────

@router.get("/", response_model=List[RoomOut])
def list_rooms(active_only: bool = True, db: Session = Depends(get_db)):
    q = db.query(Room).filter(Room.is_deleted == False)
    if active_only:
        q = q.filter(Room.is_active == True)
    return q.order_by(Room.name).all()


@router.post("/", response_model=RoomOut,
             dependencies=[Depends(check_role([UserRole.ADMIN]))])
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
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
def update_room(room_id: int, data: RoomUpdate, db: Session = Depends(get_db)):
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
def delete_room(room_id: int, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db)
):
    """
    Retourne le taux d'occupation par salle sur une période donnée.
    Par défaut : les 30 derniers jours.
    """
    if not date_from:
        date_from = date.today() - timedelta(days=30)
    if not date_to:
        date_to = date.today()

    rooms = db.query(Room).filter(Room.is_deleted == False, Room.is_active == True).all()
    result = []

    for room in rooms:
        sessions = db.query(PlannedSession).filter(
            PlannedSession.room_id == room.id,
            PlannedSession.is_cancelled == False,
            PlannedSession.date >= date_from,
            PlannedSession.date <= date_to,
        ).all()

        total_slots = len(sessions)
        # Nombre de jours dans la période
        days_range = (date_to - date_from).days + 1
        # Capacité théorique = 1 session/jour possible (simplification)
        # On calcule le taux sur le nombre de sessions vs jours ouvrables
        capacity = room.capacity or 0
        over_capacity = [s for s in sessions if capacity > 0 and getattr(s, 'enrolled_count', 0) > capacity]

        result.append({
            "room_id": room.id,
            "room_name": room.name,
            "room_color": room.color,
            "capacity": capacity,
            "total_sessions": total_slots,
            "days_range": days_range,
            "occupation_rate": round((total_slots / days_range) * 100, 1) if days_range > 0 else 0,
            "over_capacity_count": len(over_capacity),
        })

    return {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "rooms": result
    }


@router.get("/stats/week-consolidated")
def get_week_consolidated(
    week_start: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Vue semaine consolidée : toutes les salles × tous les jours de la semaine.
    week_start doit être un lundi. Par défaut : lundi de la semaine courante.
    """
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

    week_end = week_start + timedelta(days=6)

    rooms = db.query(Room).filter(Room.is_deleted == False, Room.is_active == True).order_by(Room.name).all()

    days = [week_start + timedelta(days=i) for i in range(7)]

    sessions_in_week = db.query(PlannedSession).filter(
        PlannedSession.is_cancelled == False,
        PlannedSession.date >= week_start,
        PlannedSession.date <= week_end,
    ).all()

    # Index sessions par (room_id, date)
    from collections import defaultdict
    sessions_map = defaultdict(list)
    for s in sessions_in_week:
        sessions_map[(s.room_id, str(s.date))].append(s)

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
            day_str = str(day)
            day_sessions = sessions_map.get((room.id, day_str), [])
            enrolled_total = sum(getattr(s, 'enrolled_count', 0) for s in day_sessions)
            row["days"][day_str] = {
                "sessions": [
                    {
                        "id": s.id,
                        "time_start": str(s.time_start) if hasattr(s, 'time_start') else None,
                        "time_end": str(s.time_end) if hasattr(s, 'time_end') else None,
                        "training_name": s.training.name if hasattr(s, 'training') and s.training else None,
                        "enrolled_count": getattr(s, 'enrolled_count', 0),
                    }
                    for s in day_sessions
                ],
                "session_count": len(day_sessions),
                "enrolled_total": enrolled_total,
                "over_capacity": bool(room.capacity and enrolled_total > room.capacity),
            }
        grid.append(row)

    return {
        "week_start": str(week_start),
        "week_end": str(week_end),
        "days": [str(d) for d in days],
        "grid": grid
    }

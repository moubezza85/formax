from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models.models import Room, UserRole
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
    # Soft delete
    room.is_deleted = True
    room.is_active = False
    db.commit()
    return {"detail": "Salle supprimée."}

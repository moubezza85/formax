from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.models import Pack, Training, UserRole
from ..schemas.schemas import PackCreate, PackOut, PackUpdate
from ..api.deps import check_role

router = APIRouter()

@router.get("/", response_model=List[PackOut])
def get_packs(db: Session = Depends(get_db)):
    return db.query(Pack).filter(Pack.is_deleted == False).all()

@router.post("/", response_model=PackOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def create_pack(pack_in: PackCreate, db: Session = Depends(get_db)):
    db_pack = Pack(name=pack_in.name, discount_rate=pack_in.discount_rate)
    
    # Associate trainings
    trainings = db.query(Training).filter(Training.id.in_(pack_in.training_ids)).all()
    db_pack.trainings = trainings
    
    db.add(db_pack)
    db.commit()
    db.refresh(db_pack)
    return db_pack

@router.patch("/{pack_id}", response_model=PackOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_pack(pack_id: int, pack_in: PackUpdate, db: Session = Depends(get_db)):
    db_pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not db_pack:
        raise HTTPException(status_code=404, detail="Pack non trouvé")
    
    if pack_in.name is not None:
        db_pack.name = pack_in.name
    if pack_in.discount_rate is not None:
        db_pack.discount_rate = pack_in.discount_rate
    if pack_in.training_ids is not None:
        trainings = db.query(Training).filter(Training.id.in_(pack_in.training_ids)).all()
        db_pack.trainings = trainings
        
    db.commit()
    db.refresh(db_pack)
    return db_pack

@router.delete("/{pack_id}", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def delete_pack(pack_id: int, db: Session = Depends(get_db)):
    db_pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not db_pack:
        raise HTTPException(status_code=404, detail="Pack non trouvé")
    
    db_pack.is_deleted = True
    db.commit()
    return {"message": "Pack supprimé"}

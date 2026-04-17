from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.models import WizardDraft, UserRole
from ..schemas.schemas import WizardDraftCreate, WizardDraftOut
from ..api.deps import check_role

router = APIRouter()

@router.get("/", response_model=List[WizardDraftOut])
def list_drafts(db: Session = Depends(get_db)):
    return db.query(WizardDraft).filter(WizardDraft.is_deleted == False).order_by(WizardDraft.updated_at.desc()).all()

@router.get("/{draft_id}", response_model=WizardDraftOut)
def get_draft(draft_id: int, db: Session = Depends(get_db)):
    db_draft = db.query(WizardDraft).filter(WizardDraft.id == draft_id).first()
    if not db_draft:
        raise HTTPException(status_code=404, detail="Brouillon non trouvé")
    return db_draft

@router.post("/", response_model=WizardDraftOut)
def save_draft(draft_in: WizardDraftCreate, db: Session = Depends(get_db)):
    # Simple strategy: keep tracking multiple drafts by name
    db_draft = db.query(WizardDraft).filter(WizardDraft.name == draft_in.name).first()
    
    if db_draft:
        db_draft.current_step = draft_in.current_step
        db_draft.data_json = draft_in.data_json
    else:
        db_draft = WizardDraft(**draft_in.dict())
        db.add(db_draft)
    
    db.commit()
    db.refresh(db_draft)
    return db_draft

@router.delete("/{draft_id}")
def delete_draft(draft_id: int, db: Session = Depends(get_db)):
    db_draft = db.query(WizardDraft).filter(WizardDraft.id == draft_id).first()
    if not db_draft:
        raise HTTPException(status_code=404, detail="Brouillon non trouvé")
    db_draft.is_deleted = True
    db.commit()
    return {"message": "Brouillon supprimé"}

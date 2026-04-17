from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.models import Enrollment, UserRole
from ..schemas.schemas import EnrollmentOut
from ..api.deps import check_role

router = APIRouter()

@router.get("/", response_model=List[EnrollmentOut], dependencies=[Depends(check_role([UserRole.ADMIN]))])
def list_enrollments(
    status: Optional[str] = None, 
    student_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Enrollment).filter(Enrollment.is_deleted == False)
    
    if status:
        query = query.filter(Enrollment.status == status)
    if student_id:
        query = query.filter(Enrollment.student_id == student_id)
        
    return query.order_by(Enrollment.created_at.desc()).all()

@router.get("/{id}", response_model=EnrollmentOut, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_enrollment(id: int, db: Session = Depends(get_db)):
    db_enrollment = db.query(Enrollment).filter(Enrollment.id == id).first()
    if not db_enrollment:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")
    return db_enrollment

@router.patch("/{id}/status", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_enrollment_status(id: int, status: str, db: Session = Depends(get_db)):
    db_enrollment = db.query(Enrollment).filter(Enrollment.id == id).first()
    if not db_enrollment:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")
    
    db_enrollment.status = status
    db.commit()
    return {"message": "Statut mis à jour"}

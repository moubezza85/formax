from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.models import Attendance, UserRole
from ..schemas.schemas import AttendanceCreate, AttendanceOut, StudentAttendanceSummary
from ..api.deps import check_role

router = APIRouter()

@router.post("/bulk", response_model=List[AttendanceOut])
def record_bulk_attendance(attendance_list: List[AttendanceCreate], db: Session = Depends(get_db)):
    db_items = []
    for item in attendance_list:
        db_item = Attendance(**item.dict())
        db.add(db_item)
        db_items.append(db_item)
    db.commit()
    for item in db_items:
        db.refresh(item)
    return db_items

@router.get("/session/{session_id}", response_model=List[AttendanceOut])
def get_session_attendance(session_id: int, db: Session = Depends(get_db)):
    return db.query(Attendance).filter(Attendance.session_id == session_id).all()

@router.get("/training/{training_id}/summary", response_model=List[StudentAttendanceSummary])
def get_training_attendance_summary(training_id: int, db: Session = Depends(get_db)):
    from ..models.models import Enrollment, Student, User, Session as SessionModel
    
    # 1. Get all students enrolled in this training
    enrollments = db.query(Enrollment).filter(Enrollment.training_id == training_id, Enrollment.is_deleted == False).all()
    student_ids = [e.student_id for e in enrollments]
    
    # 2. Get all completed sessions for this training
    sessions = db.query(SessionModel).filter(SessionModel.training_id == training_id, SessionModel.status == 'completed').all()
    session_ids = [s.id for s in sessions]
    
    results = []
    for s_id in student_ids:
        student = db.query(Student).filter(Student.id == s_id).first()
        user = db.query(User).filter(User.id == student.user_id).first()
        
        # Get attendance records for this student in these sessions
        history = db.query(Attendance).filter(
            Attendance.student_id == s_id,
            Attendance.session_id.in_(session_ids) if session_ids else False
        ).all()
        
        present_count = sum(1 for h in history if h.is_present)
        rate = (present_count / len(session_ids) * 100) if session_ids else 100
        
        results.append({
            "student_id": s_id,
            "student_name": f"{user.first_name} {user.last_name}",
            "attendance_rate": rate,
            "history": history
        })
        
    return results

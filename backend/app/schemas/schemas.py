from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from ..models.models import UserRole

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.STUDENT

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Training Schemas
class TrainingBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_hours: Optional[float] = None

class TrainingOut(TrainingBase):
    id: int
    is_deleted: bool
    class Config:
        from_attributes = True

class TrainingCreate(TrainingBase):
    pass

class TrainingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_hours: Optional[float] = None

# Pack Schemas
class PackBase(BaseModel):
    name: str
    discount_rate: float = 0.0

class PackCreate(PackBase):
    training_ids: List[int]

class PackOut(PackBase):
    id: int
    trainings: List[TrainingOut]
    is_deleted: bool
    class Config:
        from_attributes = True

class PackUpdate(BaseModel):
    name: Optional[str] = None
    discount_rate: Optional[float] = None
    training_ids: Optional[List[int]] = None

# Enrollment Schemas
class EnrollmentCreate(BaseModel):
    student_id: int
    training_id: Optional[int] = None
    pack_id: Optional[int] = None
    discount_rate: float = 0.0

class EnrollmentOut(BaseModel):
    id: int
    student_id: int
    training_id: Optional[int] = None
    pack_id: Optional[int] = None
    final_price: float
    status: str
# Payment Schemas
class StudentPaymentCreate(BaseModel):
    enrollment_id: int
    amount: float
    payment_type: str # full | monthly | installment | flexible

class StudentPaymentOut(BaseModel):
    id: int
    enrollment_id: int
    amount: float
    date: datetime
    payment_type: str
    remaining_balance: float
    class Config:
        from_attributes = True

class TrainerPaymentCreate(BaseModel):
    trainer_id: int
    training_id: int
    amount: float
    payment_type: str

# Attendance Schemas
class AttendanceCreate(BaseModel):
    session_id: int
    student_id: int
    is_present: bool = True
    justification: Optional[str] = None

class AttendanceOut(AttendanceCreate):
    id: int
    class Config:
        from_attributes = True

class StudentAttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    attendance_rate: float
    history: List[AttendanceOut]

# Wizard Draft Schemas
class WizardDraftCreate(BaseModel):
    name: str
    current_step: int
    data_json: Any

class WizardDraftOut(WizardDraftCreate):
    id: int
    updated_at: datetime
    class Config:
        from_attributes = True
class SessionCreate(BaseModel):
    training_id: int
    trainer_id: int
    date: datetime
    duration_hours: float
    room: Optional[str] = None
    status: str = "planned"

class SessionOut(BaseModel):
    id: int
    training_id: int
    trainer_id: int
    date: datetime
    duration_hours: float
    room: Optional[str] = None
    status: str
    class Config:
        from_attributes = True

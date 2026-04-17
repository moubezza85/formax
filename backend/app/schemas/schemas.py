from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from ..models.models import UserRole, TrainerPaymentMode, StudentPaymentType, StudentPaymentMode

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

# Trainer specific schemas
class TrainerCreate(BaseModel):
    specialty: Optional[str] = None
    level: Optional[str] = None
    default_payment_mode: TrainerPaymentMode = TrainerPaymentMode.HOURLY
    hourly_rate: float = 0.0
    monthly_salary: float = 0.0
    price_per_student: float = 0.0
    fixed_price_per_training: float = 0.0

class TrainerOut(BaseModel):
    id: int
    user_id: int
    user: Optional[UserOut] = None
    specialty: Optional[str] = None
    level: Optional[str] = None
    default_payment_mode: TrainerPaymentMode
    hourly_rate: float
    monthly_salary: float
    price_per_student: float
    fixed_price_per_training: float
    class Config:
        from_attributes = True

# Student specific schemas
class StudentCreate(BaseModel):
    parent_phone: Optional[str] = None
    specialty: Optional[str] = None

class StudentOut(BaseModel):
    id: int
    user_id: int
    user: Optional[UserOut] = None
    parent_phone: Optional[str] = None
    specialty: Optional[str] = None
    created_at: datetime
    added_at: datetime
    class Config:
        from_attributes = True

# Training Schemas
class TrainingBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_hours: Optional[float] = None
    masse_horaire: Optional[float] = None
    status: str = "draft"

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
    masse_horaire: Optional[float] = None
    status: Optional[str] = None

# Pack Schemas
class PackBase(BaseModel):
    name: str
    description: Optional[str] = None
    discount_rate: float = 0.0

class PackCreate(PackBase):
    training_ids: List[int]

class PackOut(PackBase):
    id: int
    trainings: List[TrainingOut]
    created_at: datetime
    is_deleted: bool
    class Config:
        from_attributes = True

class PackUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_rate: Optional[float] = None
    training_ids: Optional[List[int]] = None

# Enrollment Schemas
class EnrollmentCreate(BaseModel):
    student_id: int
    training_id: Optional[int] = None
    pack_id: Optional[int] = None
    discount_rate: float = 0.0
    payment_mode: StudentPaymentMode = StudentPaymentMode.FULL
    monthly_amount: Optional[float] = None
    installment_count: Optional[int] = None

class EnrollmentOut(BaseModel):
    id: int
    student_id: int
    student: Optional[StudentOut] = None
    training_id: Optional[int] = None
    training: Optional[TrainingOut] = None
    pack_id: Optional[int] = None
    pack: Optional[PackOut] = None
    final_price: float
    payment_mode: StudentPaymentMode
    monthly_amount: Optional[float] = None
    installment_count: Optional[int] = None
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

# Payment Schemas
class StudentPaymentCreate(BaseModel):
    enrollment_id: int
    amount: float
    payment_type: StudentPaymentType 
    notes: Optional[str] = None
    paid_by: Optional[str] = None

class StudentPaymentOut(BaseModel):
    id: int
    enrollment_id: int
    amount: float
    date: datetime
    payment_type: StudentPaymentType
    remaining_balance: float
    notes: Optional[str] = None
    paid_by: Optional[str] = None
    class Config:
        from_attributes = True

class TrainerPaymentCreate(BaseModel):
    trainer_id: int
    training_id: int
    assignment_id: Optional[int] = None
    amount: float
    payment_type: str
    calculation_details: Optional[Any] = None

class TrainerPaymentOut(BaseModel):
    id: int
    trainer_id: int
    training_id: int
    assignment_id: Optional[int] = None
    amount: float
    date: datetime
    payment_type: str
    class Config:
        from_attributes = True

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

class TrainerAssignmentOut(BaseModel):
    id: int
    trainer_id: int
    trainer: Optional[TrainerOut] = None
    training_id: int
    payment_mode: TrainerPaymentMode
    is_primary: bool
    custom_rate: float
    assigned_hours: Optional[float] = None
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
    training_title: Optional[str] = None
    trainer_id: int
    trainer_name: Optional[str] = None
    date: datetime
    duration_hours: float
    room: Optional[str] = None
    status: str
    class Config:
        from_attributes = True

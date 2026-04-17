from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Float, Text, Enum as SqlEnum, JSON, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    TRAINER = "TRAINER"
    STUDENT = "STUDENT"

class TrainerPaymentMode(str, enum.Enum):
    HOURLY = "hourly"
    PER_STUDENT = "per_student"
    FIXED = "fixed"
    MONTHLY = "monthly"

class StudentPaymentType(str, enum.Enum):
    FULL = "full"
    MONTHLY = "monthly"
    INSTALLMENT = "installment"
    FLEXIBLE = "flexible"

class StudentPaymentMode(str, enum.Enum):
    FULL = "full"
    MONTHLY = "monthly"
    INSTALLMENT = "installment"
    FLEXIBLE = "flexible"

class SoftDeleteMixin:
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

class User(Base, SoftDeleteMixin):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String)
    role = Column(SqlEnum(UserRole), default=UserRole.STUDENT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trainer_profile = relationship("Trainer", back_populates="user", uselist=False)
    student_profile = relationship("Student", back_populates="user", uselist=False)

class Trainer(Base, SoftDeleteMixin):
    __tablename__ = "trainers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    specialty = Column(String)
    level = Column(String)
    default_payment_mode = Column(SqlEnum(TrainerPaymentMode), default=TrainerPaymentMode.HOURLY)
    hourly_rate = Column(Float, default=0.0)
    monthly_salary = Column(Float, default=0.0)
    price_per_student = Column(Float, default=0.0)
    fixed_price_per_training = Column(Float, default=0.0)

    user = relationship("User", back_populates="trainer_profile")
    assignments = relationship("TrainerAssignment", back_populates="trainer")

class Student(Base, SoftDeleteMixin):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    parent_phone = Column(String)
    specialty = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="student_profile")
    enrollments = relationship("Enrollment", back_populates="student")

# Many-to-many for Pack & Training
pack_training = Table(
    "pack_training",
    Base.metadata,
    Column("pack_id", Integer, ForeignKey("packs.id"), primary_key=True),
    Column("training_id", Integer, ForeignKey("trainings.id"), primary_key=True)
)

class Training(Base, SoftDeleteMixin):
    __tablename__ = "trainings"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False) # MAD
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    total_hours = Column(Float)
    masse_horaire = Column(Float)
    status = Column(String, default="draft") # draft | active | completed

    packs = relationship("Pack", secondary=pack_training, back_populates="trainings")
    enrollments = relationship("Enrollment", back_populates="training")

class Pack(Base, SoftDeleteMixin):
    __tablename__ = "packs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    discount_rate = Column(Float, default=0.0) # e.g., 0.1 for 10%
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trainings = relationship("Training", secondary=pack_training, back_populates="packs")
    enrollments = relationship("Enrollment", back_populates="pack")

class Enrollment(Base, SoftDeleteMixin):
    __tablename__ = "enrollments"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    training_id = Column(Integer, ForeignKey("trainings.id"), nullable=True)
    pack_id = Column(Integer, ForeignKey("packs.id"), nullable=True)
    discount_rate = Column(Float, default=0.0)
    final_price = Column(Float)
    payment_mode = Column(SqlEnum(StudentPaymentMode), default=StudentPaymentMode.FULL)
    monthly_amount = Column(Float, nullable=True)
    installment_count = Column(Integer, nullable=True)
    status = Column(String, default="active") # active, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="enrollments")
    training = relationship("Training", back_populates="enrollments")
    pack = relationship("Pack", back_populates="enrollments")
    payments = relationship("StudentPayment", back_populates="enrollment")

class TrainerAssignment(Base, SoftDeleteMixin):
    __tablename__ = "trainer_assignments"
    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"))
    training_id = Column(Integer, ForeignKey("trainings.id"))
    payment_mode = Column(SqlEnum(TrainerPaymentMode))
    is_primary = Column(Boolean, default=False)
    custom_rate = Column(Float)
    assigned_hours = Column(Float)

    trainer = relationship("Trainer", back_populates="assignments")
    training = relationship("Training")
    honoraire_payments = relationship("TrainerPayment", back_populates="assignment")

class Session(Base, SoftDeleteMixin):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    training_id = Column(Integer, ForeignKey("trainings.id"))
    trainer_id = Column(Integer, ForeignKey("trainers.id"))
    date = Column(DateTime)
    duration_hours = Column(Float)
    room = Column(String, nullable=True)
    status = Column(String, default="planned") # planned | completed | cancelled

class StudentPayment(Base, SoftDeleteMixin):
    __tablename__ = "student_payments"
    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"))
    amount = Column(Float)
    date = Column(DateTime, server_default=func.now())
    payment_type = Column(SqlEnum(StudentPaymentType))
    remaining_balance = Column(Float)
    notes = Column(String, nullable=True)
    paid_by = Column(String, nullable=True) # cash | virement | chèque

    enrollment = relationship("Enrollment", back_populates="payments")

class TrainerPayment(Base, SoftDeleteMixin):
    __tablename__ = "trainer_payments"
    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"))
    training_id = Column(Integer, ForeignKey("trainings.id"))
    assignment_id = Column(Integer, ForeignKey("trainer_assignments.id"), nullable=True)
    amount = Column(Float)
    date = Column(DateTime, server_default=func.now())
    payment_type = Column(String)
    calculation_details = Column(JSON)

    assignment = relationship("TrainerAssignment", back_populates="honoraire_payments")

class Attendance(Base, SoftDeleteMixin):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    is_present = Column(Boolean, default=True)
    justification = Column(String, nullable=True) # Reason for absence

class WizardDraft(Base, SoftDeleteMixin):
    __tablename__ = "wizard_drafts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    current_step = Column(Integer, default=1)
    data_json = Column(JSON)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

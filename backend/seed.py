from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.models import User, Trainer, Student, Training, UserRole
from app.core.security import get_password_hash
import datetime

def seed():
    db = SessionLocal()
    # Create Tables
    Base.metadata.create_all(bind=engine)

    # Clean Up
    db.query(User).delete()
    db.query(Training).delete()
    db.commit()

    # 1. Create Admin
    admin = User(
        email="admin@formax.ma",
        password_hash=get_password_hash("admin123"),
        first_name="Admin",
        last_name="Formax",
        role=UserRole.ADMIN
    )
    db.add(admin)

    # 2. Create Trainer
    trainer_user = User(
        email="trainer@formax.ma",
        password_hash=get_password_hash("trainer123"),
        first_name="Yassine",
        last_name="Bennani",
        role=UserRole.TRAINER
    )
    db.add(trainer_user)
    db.flush()

    trainer_profile = Trainer(
        user_id=trainer_user.id,
        specialty="Full Stack Development",
        default_payment_mode="hourly",
        hourly_rate=250.0
    )
    db.add(trainer_profile)

    # 3. Create Student
    student_user = User(
        email="student@formax.ma",
        password_hash=get_password_hash("student123"),
        first_name="Sara",
        last_name="Idrissi",
        role=UserRole.STUDENT
    )
    db.add(student_user)
    db.flush()

    student_profile = Student(
        user_id=student_user.id,
        specialty="Digital Marketing"
    )
    db.add(student_profile)

    # 4. Create Trainings
    trainings = [
        Training(title="Python & FastAPI Masterclass", price=2500.0, total_hours=40),
        Training(title="React & Modern UI Design", price=3000.0, total_hours=50),
        Training(title="DevOps & Docker", price=4500.0, total_hours=60)
    ]
    db.add_all(trainings)

    db.commit()
    print("Database Seeded Successfully!")

if __name__ == "__main__":
    seed()

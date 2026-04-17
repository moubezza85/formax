from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.models import User, Trainer, Student, Training, UserRole, Pack, Enrollment, TrainerAssignment, StudentPayment, TrainerPayment, StudentPaymentMode, StudentPaymentType, TrainerPaymentMode
from app.core.security import get_password_hash
from datetime import datetime, timedelta
import random

def seed():
    db = SessionLocal()
    # Create Tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # 1. Create Admin
    admin = User(
        email="admin@formax.ma",
        password_hash=get_password_hash("admin123"),
        first_name="Admin",
        last_name="Formax",
        role=UserRole.ADMIN
    )
    db.add(admin)

    # 2. Create Trainers
    trainers_data = [
        {"email": "trainer@formax.ma", "pw": "trainer123", "fn": "Yassine", "ln": "Bennani", "spec": "Full Stack", "rate": 250, "mode": TrainerPaymentMode.HOURLY},
        {"email": "fatima@formax.ma", "pw": "trainer123", "fn": "Fatima", "ln": "Zahra", "spec": "Design UI/UX", "fixed": 5000, "mode": TrainerPaymentMode.FIXED},
    ]
    
    trainer_profiles = []
    for t in trainers_data:
        u = User(email=t["email"], password_hash=get_password_hash(t["pw"]), first_name=t["fn"], last_name=t["ln"], role=UserRole.TRAINER)
        db.add(u)
        db.flush()
        tp = Trainer(
            user_id=u.id, 
            specialty=t["spec"], 
            default_payment_mode=t["mode"],
            hourly_rate=t.get("rate", 0),
            fixed_price_per_training=t.get("fixed", 0)
        )
        db.add(tp)
        trainer_profiles.append(tp)
    
    db.flush()

    # 3. Create Trainings
    trainings = [
        Training(title="Python & FastAPI Masterclass", price=2500.0, total_hours=40, masse_horaire=40, status="active"),
        Training(title="React & Modern UI Design", price=3500.0, total_hours=50, masse_horaire=50, status="active"),
        Training(title="DevOps & Docker Essentials", price=4500.0, total_hours=30, masse_horaire=30, status="active"),
    ]
    db.add_all(trainings)
    db.flush()

    # 4. Create a Pack
    pack = Pack(name="Bundle Full Stack", description="Python + React avec une réduction de 20%", discount_rate=0.2)
    pack.trainings = [trainings[0], trainings[1]]
    db.add(pack)
    db.flush()

    # 5. Create Students
    students_data = [
        {"email": "student@formax.ma", "pw": "student123", "fn": "Sara", "ln": "Idrissi"},
        {"email": "kamal@gmail.com", "pw": "student123", "fn": "Kamal", "ln": "Azzi"},
        {"email": "leila@outlook.com", "pw": "student123", "fn": "Leila", "ln": "Mansouri"},
    ]
    
    student_profiles = []
    for s in students_data:
        u = User(email=s["email"], password_hash=get_password_hash(s["pw"]), first_name=s["fn"], last_name=s["ln"], role=UserRole.STUDENT)
        db.add(u)
        db.flush()
        sp = Student(user_id=u.id, specialty="Informatique")
        db.add(sp)
        student_profiles.append(sp)
    
    db.flush()

    # 6. Assignments
    # Yassine on Python (Hourly)
    a1 = TrainerAssignment(trainer_id=trainer_profiles[0].id, training_id=trainings[0].id, payment_mode=TrainerPaymentMode.HOURLY, custom_rate=250, is_primary=True)
    # Fatima on React (Fixed)
    a2 = TrainerAssignment(trainer_id=trainer_profiles[1].id, training_id=trainings[1].id, payment_mode=TrainerPaymentMode.FIXED, custom_rate=5000, is_primary=True)
    db.add_all([a1, a2])

    # 7. Enrollments & Payments
    # Student 1: Python (Full payment)
    e1 = Enrollment(student_id=student_profiles[0].id, training_id=trainings[0].id, final_price=2500.0, payment_mode=StudentPaymentMode.FULL)
    db.add(e1)
    db.flush()
    db.add(StudentPayment(enrollment_id=e1.id, amount=2500.0, payment_type=StudentPaymentType.FULL, remaining_balance=0.0, notes="Paiement intégral", paid_by="virement"))

    # Student 2: Pack Bundle (Installments)
    # Price = (2500 + 3500) * 0.8 = 4800
    e2 = Enrollment(student_id=student_profiles[1].id, pack_id=pack.id, final_price=4800.0, payment_mode=StudentPaymentMode.INSTALLMENT, installment_count=3)
    db.add(e2)
    db.flush()
    # First installment
    db.add(StudentPayment(enrollment_id=e2.id, amount=1600.0, payment_type=StudentPaymentType.INSTALLMENT, remaining_balance=3200.0, notes="1ère tranche", paid_by="cash"))
    # Second installment
    db.add(StudentPayment(enrollment_id=e2.id, amount=1600.0, payment_type=StudentPaymentType.INSTALLMENT, remaining_balance=1600.0, notes="2ème tranche", paid_by="chèque"))

    # Student 3: React (Discounted, Monthly)
    e3 = Enrollment(student_id=student_profiles[2].id, training_id=trainings[1].id, discount_rate=0.1, final_price=3150.0, payment_mode=StudentPaymentMode.MONTHLY)
    db.add(e3)
    db.flush()
    db.add(StudentPayment(enrollment_id=e3.id, amount=1000.0, payment_type=StudentPaymentType.MONTHLY, remaining_balance=2150.0, notes="Mensualité Avril", paid_by="virement"))

    db.commit()
    print("Database Seeded with complex financial data Successfully!")

if __name__ == "__main__":
    seed()

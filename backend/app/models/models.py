from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum as SQLEnum, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base   # ← важно

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SENIOR_MANAGER = "senior_manager"
    MANAGER = "manager"

class ApplicationStatus(str, enum.Enum):
    NEW = "new"
    WAITING_CALL = "waiting_call"
    OVERDUE = "overdue"
    ENROLLED = "enrolled"
    REJECTED = "rejected"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    full_name = Column(String)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    grade = Column(Integer, nullable=False)
    format = Column(String, nullable=True)
    price = Column(Integer, nullable=False)
    free_places = Column(Integer, default=0)

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, unique=True)
    created_at = Column(DateTime, server_default=func.now())
    student_name = Column(String, nullable=False)
    grade = Column(Integer, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String)
    course_id = Column(Integer, ForeignKey("courses.id"))
    status = Column(SQLEnum(ApplicationStatus), default=ApplicationStatus.NEW)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    next_contact_date = Column(Date, nullable=True)
    comment = Column(Text)

    course = relationship("Course")
    manager = relationship("User")
from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import Optional
from app.models.models import UserRole, ApplicationStatus

class Token(BaseModel):
    access_token: str
    token_type: str

class CourseBase(BaseModel):
    name: str
    subject: str
    grade: int = Field(..., ge=9, le=11)
    format: Optional[str] = None
    price: int = Field(..., gt=0)
    free_places: int = Field(..., ge=0)

class Course(CourseBase):
    id: int
    class Config:
        from_attributes = True

class ApplicationBase(BaseModel):
    student_name: str
    grade: int = Field(..., ge=9, le=11)
    phone: str
    email: Optional[EmailStr] = None
    course_id: Optional[int] = None
    next_contact_date: Optional[date] = None
    comment: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class Application(ApplicationBase):
    id: int
    number: str
    created_at: datetime
    status: ApplicationStatus
    manager_id: Optional[int] = None
    class Config:
        from_attributes = True
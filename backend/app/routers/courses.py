from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Course, UserRole
from app.routers.dependencies import get_current_user

router = APIRouter()   # Без prefix

# Все курсы
@router.get("/courses")
def get_courses(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Все роли могут просматривать курсы"""
    return db.query(Course).all()


# Создание курса
@router.post("/courses")
def create_course(course_data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Только Администратор"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Только администратор может создавать курсы")
    
    course = Course(
        name=course_data.get("name"),
        subject=course_data.get("subject"),
        grade=course_data.get("grade"),
        format=course_data.get("format"),
        price=course_data.get("price"),
        free_places=course_data.get("free_places", 0)
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# Редактирование курса
@router.put("/courses/{course_id}")
def update_course(course_id: int, course_data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Только Администратор"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Только администратор может редактировать курсы")
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Курс не найден")

    for key, value in course_data.items():
        if value is not None:
            setattr(course, key, value)

    db.commit()
    db.refresh(course)
    return course


# Удаление курса
@router.delete("/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Только Администратор"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Только администратор может удалять курсы")
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Курс не найден")
    
    db.delete(course)
    db.commit()
    return {"message": "Курс удалён"}
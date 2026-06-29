from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.models.models import Application, Course, User, UserRole
from app.core.security import decode_token

router = APIRouter()

# Получение текущего пользователя
def get_current_user(authorization: str = None, db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        # fallback для теста
        return db.query(User).filter(User.username == "admin").first()
    
    token = authorization.replace("Bearer ", "")
    username = decode_token(token)
    if not username:
        return db.query(User).filter(User.username == "admin").first()
    
    user = db.query(User).filter(User.username == username).first()
    return user

@router.get("/")
def get_applications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Application).options(joinedload(Application.course), joinedload(Application.manager))

    if current_user and current_user.role == UserRole.MANAGER:
        query = query.filter(Application.manager_id == current_user.id)

    return query.all()

@router.get("/{app_id}")
def get_application(app_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    app = db.query(Application).options(joinedload(Application.course), joinedload(Application.manager)).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return app

@router.post("/")
def create_application(app_data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Не авторизован")

    if app_data.get("course_id"):
        course = db.query(Course).filter(Course.id == app_data["course_id"]).first()
        if course and course.free_places > 0:
            course.free_places -= 1

    count = db.query(Application).count() + 1
    db_app = Application(
        student_name=app_data["student_name"],
        grade=app_data["grade"],
        phone=app_data["phone"],
        email=app_data.get("email"),
        course_id=app_data.get("course_id"),
        manager_id=current_user.id,
        number=str(count)
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.put("/{app_id}")
def update_application(app_id: int, app_data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    # Проверка прав по ТЗ
    if current_user.role == UserRole.MANAGER and app.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Вы можете редактировать только свои заявки")

    if current_user.role == UserRole.SENIOR_MANAGER:
        if app.manager and app.manager.role == UserRole.SENIOR_MANAGER and app.manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="Вы не можете редактировать заявки других Сеньёров")

    for key, value in app_data.items():
        if value is not None and key != "id":
            setattr(app, key, value)

    db.commit()
    db.refresh(app)
    return app

@router.delete("/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if current_user.role == UserRole.MANAGER and app.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Вы можете удалять только свои заявки")

    if current_user.role == UserRole.SENIOR_MANAGER:
        if app.manager and app.manager.role == UserRole.SENIOR_MANAGER and app.manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="Вы не можете удалять заявки других Сеньёров")

    if app.course_id:
        course = db.query(Course).filter(Course.id == app.course_id).first()
        if course:
            course.free_places += 1

    db.delete(app)
    db.commit()
    return {"message": "Заявка удалена"}
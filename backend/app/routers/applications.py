from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.core.database import get_db
from app.models.models import Application, Course, User
from app.models.user import Role
from app.core.permissions import get_current_user

router = APIRouter()


@router.get("/applications")
def get_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    search: str = None,
    status: str = None
):
    """Получение заявок с учётом ролей"""
    print(f"DEBUG: User = {current_user.username if current_user else None}, Role = {current_user.role if current_user else None}")

    query = db.query(Application).options(
        joinedload(Application.course), 
        joinedload(Application.manager)
    )

    if current_user:
        if current_user.role == Role.MANAGER:
            print("DEBUG: Применяем фильтр для MANAGER")
            query = query.filter(Application.manager_id == current_user.id)
        else:
            print("DEBUG: Пользователь с ролью выше MANAGER — видит все")

    # Поиск
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Application.student_name.ilike(search_term),
                Application.phone.ilike(search_term)
            )
        )

    # Фильтр по статусу
    if status:
        query = query.filter(Application.status == status)

    result = query.all()
    print(f"DEBUG: Найдено заявок: {len(result)}")
    return result


@router.get("/applications/{app_id}")
def get_application(
    app_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).options(
        joinedload(Application.course), 
        joinedload(Application.manager)
    ).filter(Application.id == app_id).first()

    if not app:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if current_user and current_user.role == Role.MANAGER and app.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    return app


@router.post("/applications")
def create_application(
    app_data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
        number=str(count),
        status=app_data.get("status", "new")
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app


@router.put("/applications/{app_id}")
def update_application(
    app_id: int, 
    app_data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    # Жёсткая проверка прав
    if current_user.role == Role.MANAGER:
        if app.manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="Вы можете редактировать только свои заявки")

    # Старший менеджер может редактировать все (или только свои — по желанию)
    # Сейчас оставляем как есть — может все

    for key, value in app_data.items():
        if value is not None and key not in ["id"]:
            setattr(app, key, value)

    db.commit()
    db.refresh(app)
    return app


@router.delete("/applications/{app_id}")
def delete_application(
    app_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if current_user and current_user.role == Role.MANAGER and app.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Вы можете удалять только свои заявки")

    if app.course_id:
        course = db.query(Course).filter(Course.id == app.course_id).first()
        if course:
            course.free_places += 1

    db.delete(app)
    db.commit()
    return {"message": "Заявка удалена"}
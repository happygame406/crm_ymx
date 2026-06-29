from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, UserRole
from app.core.security import get_password_hash
from app.routers.dependencies import get_current_user

router = APIRouter()

@router.get("/")
def get_users(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Только администратор может просматривать пользователей")
    return db.query(User).all()

@router.post("/")
def create_user(user_data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Только администратор может создавать пользователей")

    if db.query(User).filter(User.username == user_data["username"]).first():
        raise HTTPException(status_code=400, detail="Пользователь уже существует")

    user = User(
        username=user_data["username"],
        full_name=user_data["full_name"],
        hashed_password=get_password_hash(user_data["password"]),
        role=user_data["role"]
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
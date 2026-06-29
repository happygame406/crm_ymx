from app.core.database import SessionLocal
from app.models.models import User
from app.core.security import get_password_hash
from app.models.models import UserRole

db = SessionLocal()

users = [
    {
        "username": "admin",
        "full_name": "Главный Администратор",
        "password": "admin123",
        "role": UserRole.ADMIN
    },
    {
        "username": "senior",
        "full_name": "Старший Менеджер",
        "password": "12345",
        "role": UserRole.SENIOR_MANAGER
    },
    {
        "username": "manager1",
        "full_name": "Менеджер Иванов",
        "password": "12345",
        "role": UserRole.MANAGER
    }
]

for u in users:
    existing = db.query(User).filter(User.username == u["username"]).first()
    if not existing:
        user = User(
            username=u["username"],
            full_name=u["full_name"],
            hashed_password=get_password_hash(u["password"]),
            role=u["role"]
        )
        db.add(user)
        print(f"✅ Создан пользователь: {u['username']} ({u['role']})")
    else:
        print(f"Пользователь {u['username']} уже существует")

db.commit()
db.close()

print("\nГотово! Можно заходить:")
print("admin / admin123")
print("senior / 12345")
print("manager1 / 12345")
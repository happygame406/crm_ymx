from app.core.database import SessionLocal
from app.models.user import User, Role
from app.core.security import get_password_hash

db = SessionLocal()

users = [
    ('admin', 'admin123', Role.ADMIN, 'Администратор'),
    ('senior', 'senior123', Role.SENIOR_MANAGER, 'Старший Менеджер'),
    ('manager', 'manager123', Role.MANAGER, 'Менеджер')
]

for username, password, role, full_name in users:
    if not db.query(User).filter(User.username == username).first():
        user = User(
            username=username,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            role=role
        )
        db.add(user)
        print(f'✅ Создан: {username} ({role})')
    else:
        print(f'⏭ Уже существует: {username}')

db.commit()
db.close()
print('🎉 Готово! Тестовые пользователи созданы.')
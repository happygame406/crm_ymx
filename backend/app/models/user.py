from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()

class Role(str, enum.Enum):
    ADMIN = "admin"
    SENIOR_MANAGER = "senior_manager"
    MANAGER = "manager"
    GUEST = "guest"   # для неавторизованных

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(Role), default=Role.GUEST)
    full_name = Column(String, nullable=True)
    is_active = Column(Integer, default=1)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.core.database import engine
from app.models.models import Base
from app.routers import auth, applications, courses, users

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CRM Юмакс")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

@app.get("/")
def root():
    return {"message": "CRM Юмакс работает!"}

app.mount("/static", StaticFiles(directory="../frontend", html=True), name="static")

if __name__ == "__main__":
    print("🚀 Сервер запущен: http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
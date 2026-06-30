from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, applications, courses, users

app = FastAPI(title="CRM YMX")

app.mount("/static", StaticFiles(directory="../frontend", html=True), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры БЕЗ двойного префикса
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(applications.router, prefix="/api", tags=["applications"])
app.include_router(courses.router, prefix="/api", tags=["courses"])
app.include_router(users.router, prefix="/api", tags=["users"])


@app.get("/")
def root():
    return {"status": "ok"}
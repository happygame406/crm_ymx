import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
import uvicorn

if __name__ == "__main__":
    print("🚀 Запуск CRM Юмакс...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
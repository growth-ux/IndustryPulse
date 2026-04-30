import uvicorn
from app.config import print_database_settings

if __name__ == "__main__":
    print_database_settings()

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

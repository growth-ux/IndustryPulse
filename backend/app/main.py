from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.scheduler import scheduler_service

app = FastAPI(
    title="IndustryPulse API",
    description="产业热点时间轴分析工具API",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    scheduler_service.start()
    import threading
    t = threading.Thread(target=scheduler_service.crawler.run)
    t.start()


@app.on_event("shutdown")
async def shutdown():
    scheduler_service.stop()

# 导入路由
from app.api import timeline
from app.api.insights import router as insights_router
from app.api.favorites import router as favorites_router
from app.api.hot import router as hot_router

app.include_router(timeline.router, prefix="/api", tags=["timeline"])
app.include_router(insights_router, prefix="/api", tags=["insights"])
app.include_router(favorites_router, prefix="/api", tags=["favorites"])
app.include_router(hot_router, prefix="/api", tags=["hot"])

@app.get("/")
async def root():
    return {"message": "IndustryPulse API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

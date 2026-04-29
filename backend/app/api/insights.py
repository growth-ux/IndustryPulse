from fastapi import APIRouter
from app.models.schema import (
    InsightStatsResponse,
    TrendResponse,
    DistributionResponse,
    ComparisonResponse,
    ActivitiesResponse,
)

router = APIRouter()

@router.get("/insights/stats", response_model=InsightStatsResponse)
async def get_insight_stats(track: str, period: str = "30d"):
    """获取统计卡片数据"""
    from app.services.processor import processor
    return processor.get_insight_stats(track, period)

@router.get("/insights/trends", response_model=TrendResponse)
async def get_insight_trends(track: str, period: str = "30d"):
    """获取内容趋势数据"""
    from app.services.processor import processor
    return processor.get_insight_trends(track, period)

@router.get("/insights/distribution", response_model=DistributionResponse)
async def get_insight_distribution(track: str, period: str = "30d"):
    """获取内容分布数据"""
    from app.services.processor import processor
    return processor.get_insight_distribution(track, period)

@router.get("/insights/comparison", response_model=ComparisonResponse)
async def get_insight_comparison():
    """获取赛道对比数据"""
    from app.services.processor import processor
    return processor.get_insight_comparison()

@router.get("/insights/activities", response_model=ActivitiesResponse)
async def get_insight_activities(track: str, limit: int = 5):
    """获取最新动态"""
    from app.services.processor import processor
    return processor.get_insight_activities(track, limit)
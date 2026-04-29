from fastapi import APIRouter, HTTPException
from app.models.schema import (
    TimelineRequest,
    TimelineResponse,
    TypesResponse,
    ExportResponse,
    IndustriesResponse,
    AddIndustryRequest,
)
from app.services.processor import processor

router = APIRouter()

@router.post("/timeline/generate", response_model=TimelineResponse)
async def generate_timeline(request: TimelineRequest):
    """生成时间轴数据"""
    if request.keyword == "全部":
        result = processor.get_all_events(request.time_range)
    else:
        result = await processor.generate_timeline(request.keyword, request.time_range)
    return result

@router.get("/timeline/types", response_model=TypesResponse)
async def get_types(keyword: str, time_range: str = "month"):
    """获取事件类型统计"""
    if keyword == "全部":
        result = processor.get_all_type_stats(time_range)
    else:
        result = processor.get_type_stats(keyword, time_range)
    return result

@router.get("/export/{format}", response_model=ExportResponse)
async def export_data(keyword: str, time_range: str = "month", format: str = "json"):
    """导出数据"""
    if format not in ["json", "markdown"]:
        raise HTTPException(status_code=400, detail="format must be json or markdown")

    try:
        data = processor.export_data(keyword, time_range, format)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/timeline/recent")
async def get_recent_timeline(limit: int = 10):
    """获取数据库中最新的事件"""
    result = processor.get_recent_events(limit)
    return result

@router.get("/industries", response_model=IndustriesResponse)
async def get_industries():
    """获取所有产业赛道"""
    result = processor.get_industries()
    return result

@router.post("/industries", response_model=ExportResponse)
async def add_industry(request: AddIndustryRequest):
    """添加新产业赛道"""
    result = processor.add_industry(request.name)
    return result

@router.delete("/industries/{name}", response_model=ExportResponse)
async def remove_industry(name: str):
    """删除产业赛道"""
    result = processor.remove_industry(name)
    return result

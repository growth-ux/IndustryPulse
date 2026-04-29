from fastapi import APIRouter, HTTPException
from app.models.schema import (
    TimelineRequest,
    TimelineResponse,
    TypesResponse,
    ExportResponse,
    IndustriesResponse,
    AddIndustryRequest,
    SourcesResponse,
    AddSourceRequest,
    UpdateSourceRequest,
    Source,
    SearchType,
)
from app.database import get_db_cursor

router = APIRouter()

@router.post("/timeline/generate", response_model=TimelineResponse)
async def generate_timeline(request: TimelineRequest):
    """生成时间轴数据"""
    from app.services.processor import processor

    # 根据搜索类型分发到不同的处理逻辑
    if request.search_type == SearchType.SOURCE:
        result = processor.search_by_source(request.keyword, request.time_range, request.page, request.page_size)
    elif request.search_type == SearchType.PERSON:
        result = processor.search_by_person(request.keyword, request.time_range, request.page, request.page_size)
    elif request.keyword == "全部":
        result = processor.get_all_events(request.time_range, request.page, request.page_size)
    else:
        result = await processor.generate_timeline(request.keyword, request.time_range, request.page, request.page_size)
    return result

@router.get("/timeline/types", response_model=TypesResponse)
async def get_types(keyword: str, time_range: str = "month"):
    """获取事件类型统计"""
    from app.services.processor import processor
    if keyword == "全部":
        result = processor.get_all_type_stats(time_range)
    else:
        result = processor.get_type_stats(keyword, time_range)
    return result

@router.get("/export/{format}", response_model=ExportResponse)
async def export_data(keyword: str, time_range: str = "month", format: str = "json"):
    """导出数据"""
    from app.services.processor import processor
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
    from app.services.processor import processor
    result = processor.get_recent_events(limit)
    return result

@router.get("/industries", response_model=IndustriesResponse)
async def get_industries():
    """获取所有产业赛道"""
    from app.services.processor import processor
    result = processor.get_industries()
    return result

@router.post("/industries", response_model=ExportResponse)
async def add_industry(request: AddIndustryRequest):
    """添加新产业赛道"""
    from app.services.processor import processor
    result = processor.add_industry(request.name)
    return result

@router.delete("/industries/{name}", response_model=ExportResponse)
async def remove_industry(name: str):
    """删除产业赛道"""
    from app.services.processor import processor
    result = processor.remove_industry(name)
    return result

# ==================== 订阅源管理 API ====================

@router.get("/sources", response_model=SourcesResponse)
async def get_sources(category: str = "all"):
    """获取所有订阅源，支持按分类筛选"""
    with get_db_cursor() as cursor:
        if category == "all":
            cursor.execute("SELECT * FROM sources ORDER BY category, id")
        else:
            cursor.execute("SELECT * FROM sources WHERE category = %s ORDER BY id", (category,))
        rows = cursor.fetchall()

        sources = []
        for row in rows:
            last_update = row.get('last_update')
            sources.append(Source(
                id=row['id'],
                name=row['name'],
                category=row['category'],
                url=row.get('url'),
                description=row.get('description'),
                enabled=bool(row['enabled']),
                article_count=row.get('article_count', 0),
                last_update=last_update.isoformat() if last_update else None,
                crawl_type=row.get('crawl_type', 'rss'),
                list_selector=row.get('list_selector'),
                title_selector=row.get('title_selector'),
            ))

        return SourcesResponse(success=True, sources=sources, total=len(sources))

@router.get("/sources/categories")
async def get_source_categories():
    """获取订阅源分类统计"""
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT category,
                   COUNT(*) as total,
                   SUM(CASE WHEN enabled THEN 1 ELSE 0 END) as enabled_count
            FROM sources
            GROUP BY category
        """)
        rows = cursor.fetchall()
        return {"success": True, "categories": rows}

@router.post("/sources", response_model=ExportResponse)
async def add_source(request: AddSourceRequest):
    """添加新订阅源"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """INSERT INTO sources (name, category, url, description, enabled, crawl_type, list_selector, title_selector)
                   VALUES (%s, %s, %s, %s, TRUE, %s, %s, %s)""",
                (request.name, request.category.value, request.url,
                 request.description, request.crawl_type.value,
                 request.list_selector, request.title_selector)
            )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.put("/sources/{source_id}", response_model=ExportResponse)
async def update_source(source_id: int, request: UpdateSourceRequest):
    """更新订阅源"""
    try:
        updates = []
        params = []
        if request.name is not None:
            updates.append("name = %s")
            params.append(request.name)
        if request.category is not None:
            updates.append("category = %s")
            params.append(request.category.value)
        if request.url is not None:
            updates.append("url = %s")
            params.append(request.url)
        if request.description is not None:
            updates.append("description = %s")
            params.append(request.description)
        if request.enabled is not None:
            updates.append("enabled = %s")
            params.append(request.enabled)
        if request.crawl_type is not None:
            updates.append("crawl_type = %s")
            params.append(request.crawl_type.value)
        if request.list_selector is not None:
            updates.append("list_selector = %s")
            params.append(request.list_selector)
        if request.title_selector is not None:
            updates.append("title_selector = %s")
            params.append(request.title_selector)

        if not updates:
            return {"success": False, "error": "没有要更新的字段"}

        params.append(source_id)
        with get_db_cursor() as cursor:
            cursor.execute(
                f"UPDATE sources SET {', '.join(updates)} WHERE id = %s",
                params
            )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.patch("/sources/{source_id}/toggle", response_model=ExportResponse)
async def toggle_source(source_id: int):
    """切换订阅源启用状态"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "UPDATE sources SET enabled = NOT enabled WHERE id = %s",
                (source_id,)
            )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.delete("/sources/{source_id}", response_model=ExportResponse)
async def delete_source(source_id: int):
    """删除订阅源"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("DELETE FROM sources WHERE id = %s", (source_id,))
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db_cursor
from datetime import datetime

router = APIRouter()

# ==================== Schema ====================

class FavoriteEvent(BaseModel):
    id: str
    title: str
    source: str
    publish_date: str
    summary: str
    url: str
    type: str
    type_name: str
    track: str
    track_color: str

class FavoriteItem(BaseModel):
    id: int
    event_id: str
    event: FavoriteEvent
    annotation: Optional[str]
    created_at: str

class FavoritesResponse(BaseModel):
    success: bool
    favorites: List[FavoriteItem] = []
    total: int = 0

class FavoriteStatsResponse(BaseModel):
    success: bool
    stats: dict

class AddFavoriteRequest(BaseModel):
    event_id: str
    annotation: Optional[str] = None

class UpdateFavoriteRequest(BaseModel):
    annotation: str

class ApiResponse(BaseModel):
    success: bool
    error: Optional[str] = None

# ==================== Track color mapping ====================

TRACK_COLORS = {
    '人工智能': '#DB2777',
    '新能源汽车': '#059669',
    '半导体': '#2563EB',
    '生物医药': '#7C3AED',
    '医疗健康': '#7C3AED',
    '元宇宙': '#EC4899',
    '机器人': '#0891B2',
    '新材料': '#F59E0B',
}

# ==================== Helpers ====================

def get_event_by_id(event_id: str) -> Optional[dict]:
    """Fetch event from events table by id"""
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM events WHERE id = %s", (event_id,))
        return cursor.fetchone()

def get_event_type_info(event_type: str) -> tuple:
    """Get event type name and color"""
    type_map = {
        'policy': ('政策', '#DC2626'),
        'funding': ('融资', '#059669'),
        'product': ('产品发布', '#2563EB'),
        'ma': ('并购', '#D97706'),
        'tech': ('技术突破', '#7C3AED'),
        'report': ('财报', '#0891B2'),
        'person': ('人物', '#DB2777'),
        'other': ('其他', '#6B7280'),
    }
    return type_map.get(event_type, ('其他', '#6B7280'))

def get_track_color(track_name: str) -> str:
    return TRACK_COLORS.get(track_name, '#6B7280')

# ==================== Routes ====================

@router.get("/favorites", response_model=FavoritesResponse)
async def get_favorites(user_id: str = "weiyu"):
    """获取用户所有收藏"""
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT f.id, f.event_id, f.annotation, f.created_at,
                   e.id as evt_id, e.title, e.source, e.publish_date,
                   e.summary, e.url, e.event_type, e.keyword
            FROM favorites f
            LEFT JOIN events e ON f.event_id = e.id
            WHERE f.user_id = %s
            ORDER BY f.created_at DESC
        """, (user_id,))
        rows = cursor.fetchall()

        favorites = []
        for row in rows:
            event = None
            if row['evt_id']:
                type_name, type_color = get_event_type_info(row['event_type'])
                track_color = get_track_color(row['keyword'])
                event = FavoriteEvent(
                    id=row['evt_id'],
                    title=row['title'] or '未知标题',
                    source=row['source'] or '未知来源',
                    publish_date=str(row['publish_date']) if row['publish_date'] else '',
                    summary=row['summary'] or '',
                    url=row['url'] or '#',
                    type=row['event_type'] or 'other',
                    type_name=type_name,
                    track=row['keyword'] or '其他',
                    track_color=track_color,
                )
            else:
                # Event not found, create placeholder
                event = FavoriteEvent(
                    id=row['event_id'],
                    title='文章已不存在',
                    source='未知',
                    publish_date='',
                    summary='',
                    url='#',
                    type='other',
                    type_name='其他',
                    track='其他',
                    track_color='#6B7280',
                )

            created_at = row['created_at'].isoformat() if row['created_at'] else ''
            favorites.append(FavoriteItem(
                id=row['id'],
                event_id=row['event_id'],
                event=event,
                annotation=row['annotation'],
                created_at=created_at,
            ))

        return FavoritesResponse(success=True, favorites=favorites, total=len(favorites))

@router.get("/favorites/stats", response_model=FavoriteStatsResponse)
async def get_favorites_stats(user_id: str = "weiyu"):
    """获取收藏统计"""
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN annotation IS NOT NULL AND annotation != '' THEN 1 ELSE 0 END) as annotated
            FROM favorites
            WHERE user_id = %s
        """, (user_id,))
        row = cursor.fetchone()
        return FavoriteStatsResponse(
            success=True,
            stats={
                "total": row['total'] or 0,
                "annotated": row['annotated'] or 0,
            }
        )

@router.post("/favorites", response_model=ApiResponse)
async def add_favorite(request: AddFavoriteRequest, user_id: str = "weiyu"):
    """添加收藏"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO favorites (user_id, event_id, annotation)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE annotation = VALUES(annotation)
            """, (user_id, request.event_id, request.annotation))
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.put("/favorites", response_model=ApiResponse)
async def update_favorite(event_id: str = Query(..., description="The event ID to update"), request: UpdateFavoriteRequest = None, user_id: str = "weiyu"):
    """更新收藏笔记"""
    try:
        import urllib.parse
        decoded_event_id = urllib.parse.unquote(event_id)
        with get_db_cursor() as cursor:
            cursor.execute("""
                UPDATE favorites SET annotation = %s
                WHERE user_id = %s AND event_id = %s
            """, (request.annotation, user_id, decoded_event_id))
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.delete("/favorites", response_model=ApiResponse)
async def delete_favorite(event_id: str = Query(..., description="The event ID to delete"), user_id: str = "weiyu"):
    """删除收藏"""
    try:
        import urllib.parse
        decoded_event_id = urllib.parse.unquote(event_id)
        with get_db_cursor() as cursor:
            cursor.execute("""
                DELETE FROM favorites WHERE user_id = %s AND event_id = %s
            """, (user_id, decoded_event_id))
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

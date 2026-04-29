from typing import Dict
from datetime import datetime
from app.database import get_db_cursor

class TimelineProcessor:
    async def generate_timeline(self, keyword: str, time_range: str) -> Dict:
        """从数据库获取时间轴数据"""
        events = self._get_events_from_db(keyword, time_range)

        if not events:
            return {
                "success": False,
                "error": "未找到相关事件，请尝试其他关键词",
            }

        return {
            "success": True,
            "data": {
                "keyword": keyword,
                "time_range": time_range,
                "total_count": len(events),
                "events": events,
            },
        }

    def _get_events_from_db(self, keyword: str, time_range: str) -> list:
        """从数据库获取事件"""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, url, source, publish_date as date, summary,
                       ai_commentary, event_type as type, keyword
                FROM events
                WHERE keyword = %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                ORDER BY publish_date DESC
                """,
                (keyword, self._time_range_to_days(time_range)),
            )
            rows = cursor.fetchall()

        type_names = {
            "policy": "政策",
            "funding": "融资",
            "product": "产品发布",
            "ma": "并购",
            "tech": "技术突破",
            "report": "财报",
            "person": "人物",
            "other": "其他",
        }

        events = []
        for row in rows:
            events.append({
                "id": row["id"],
                "date": row["date"].strftime("%Y-%m-%d") if row["date"] else "",
                "title": row["title"],
                "summary": row["summary"] or "",
                "source": row["source"] or "",
                "source_icon": (row["source"] or "")[:2],
                "type": row["type"],
                "type_name": type_names.get(row["type"], "其他"),
                "ai_commentary": row["ai_commentary"] or "",
                "url": row["url"] or "",
            })
        return events

    def _save_event(self, event: Dict, keyword: str):
        """保存事件到数据库"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO events
                    (id, keyword, title, url, source, publish_date, summary,
                     ai_commentary, event_type, relevance_score, crawled_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                    ai_commentary = VALUES(ai_commentary),
                    updated_at = CURRENT_TIMESTAMP
                    """,
                    (
                        event["id"],
                        keyword,
                        event["title"],
                        event["url"],
                        event["source"],
                        event["date"],
                        event["summary"],
                        event["ai_commentary"],
                        event["type"],
                        0.5,
                        datetime.now(),
                    ),
                )
        except Exception as e:
            print(f"Error saving event: {e}")

    def get_type_stats(self, keyword: str, time_range: str) -> Dict:
        """获取类型统计"""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT event_type, COUNT(*) as count
                FROM events
                WHERE keyword = %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                GROUP BY event_type
                """,
                (keyword, self._time_range_to_days(time_range)),
            )
            rows = cursor.fetchall()

            type_names = {
                "policy": "政策",
                "funding": "融资",
                "product": "产品发布",
                "ma": "并购",
                "tech": "技术突破",
                "report": "财报",
                "person": "人物",
                "other": "其他",
            }

            types = [
                {"type": row["event_type"], "name": type_names.get(row["event_type"], "其他"), "count": row["count"]}
                for row in rows
            ]
            total = sum(t["count"] for t in types)

            return {"success": True, "types": types, "total": total}

    def _time_range_to_days(self, time_range: str) -> int:
        ranges = {"week": 7, "month": 30, "quarter": 90, "halfyear": 180, "year": 365}
        return ranges.get(time_range, 30)

    def export_data(self, keyword: str, time_range: str, format: str) -> str:
        """导出数据"""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT publish_date as date, title, source, event_type as type, ai_commentary, url
                FROM events
                WHERE keyword = %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                ORDER BY publish_date DESC
                """,
                (keyword, self._time_range_to_days(time_range)),
            )
            events = cursor.fetchall()

        if format == "json":
            import json
            return json.dumps(
                {"keyword": keyword, "time_range": time_range, "events": events},
                ensure_ascii=False,
                indent=2,
            )
        else:
            lines = [f"# {keyword} 产业热点\n", f"时间范围: {time_range}\n", f"事件总数: {len(events)}\n", "---"]
            for e in events:
                lines.append(f"\n## {e['date']} | {e['source']}\n")
                lines.append(f"**{e['title']}**\n")
                lines.append(f"类型: {e['type']}\n")
                if e.get("ai_commentary"):
                    lines.append(f"> AI点评: {e['ai_commentary']}\n")
                if e.get("url"):
                    lines.append(f"[阅读原文]({e['url']})\n")
            return "".join(lines)

    def get_recent_events(self, limit: int = 10) -> Dict:
        """获取数据库中最新的事件"""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, url, source, publish_date as date, summary,
                       ai_commentary, event_type as type, keyword
                FROM events
                ORDER BY publish_date DESC, crawled_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cursor.fetchall()

        type_names = {
            "policy": "政策",
            "funding": "融资",
            "product": "产品发布",
            "ma": "并购",
            "tech": "技术突破",
            "report": "财报",
            "person": "人物",
            "other": "其他",
        }

        events = []
        for row in rows:
            events.append({
                "id": row["id"],
                "date": row["date"].strftime("%Y-%m-%d") if row["date"] else "",
                "title": row["title"],
                "summary": row["summary"] or "",
                "source": row["source"] or "",
                "source_icon": (row["source"] or "")[:2],
                "type": row["type"],
                "type_name": type_names.get(row["type"], "其他"),
                "ai_commentary": row["ai_commentary"] or "",
                "url": row["url"] or "",
            })

        return {
            "success": True,
            "data": {
                "keyword": "最近动态",
                "time_range": "all",
                "total_count": len(events),
                "events": events,
            },
        }

    def get_industry_stats(self) -> Dict:
        """获取所有产业的统计数据"""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT keyword, COUNT(*) as count,
                       MAX(publish_date) as latest_date
                FROM events
                WHERE publish_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
                GROUP BY keyword
                ORDER BY count DESC
                """,
                (),
            )
            rows = cursor.fetchall()

        industries = []
        for row in rows:
            industries.append({
                "id": row["keyword"],
                "name": row["keyword"],
                "count": row["count"],
                "latest_date": row["latest_date"].strftime("%Y-%m-%d") if row["latest_date"] else None,
            })

        return {"success": True, "industries": industries}

    def get_industries(self) -> Dict:
        """获取所有产业赛道"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, name, icon, color_class, is_system, created_at
                FROM industries
                ORDER BY is_system DESC, created_at ASC
            """, ())
            industry_rows = cursor.fetchall()

            cursor.execute("""
                SELECT keyword, COUNT(*) as count,
                       MAX(publish_date) as latest_date
                FROM events
                WHERE publish_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
                GROUP BY keyword
            """, ())
            stats_rows = cursor.fetchall()

        stats_map = {row["keyword"]: {"count": row["count"], "latest_date": row["latest_date"]} for row in stats_rows}

        industries = []
        for row in industry_rows:
            keyword = row["name"]
            stats = stats_map.get(keyword, {"count": 0, "latest_date": None})
            industries.append({
                "id": row["id"],
                "name": row["name"],
                "icon": row["icon"],
                "color_class": row["color_class"],
                "is_system": row["is_system"],
                "count": stats["count"],
                "latest_date": stats["latest_date"].strftime("%Y-%m-%d") if stats["latest_date"] else None,
            })

        return {"success": True, "industries": industries}

    def add_industry(self, name: str) -> Dict:
        """添加新的产业赛道"""
        with get_db_cursor() as cursor:
            cursor.execute("SELECT id FROM industries WHERE id = %s OR name = %s", (name, name))
            if cursor.fetchone():
                return {"success": False, "error": "该产业已存在"}

            cursor.execute(
                """
                INSERT INTO industries (id, name, icon, color_class, is_system)
                VALUES (%s, %s, '📡', 'industry-custom', FALSE)
                """,
                (name, name),
            )
        return {"success": True}

    def remove_industry(self, name: str) -> Dict:
        """删除产业赛道"""
        with get_db_cursor() as cursor:
            cursor.execute("SELECT is_system FROM industries WHERE name = %s", (name,))
            row = cursor.fetchone()
            if not row:
                return {"success": False, "error": "产业不存在"}
            if row["is_system"]:
                return {"success": False, "error": "系统产业不能删除"}

            cursor.execute("DELETE FROM industries WHERE name = %s", (name,))
        return {"success": True}

    def get_all_events(self, time_range: str = "month") -> Dict:
        """获取所有产业的事件"""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, url, source, publish_date as date, summary,
                       ai_commentary, event_type as type, keyword
                FROM events
                WHERE publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                ORDER BY publish_date DESC
                """,
                (self._time_range_to_days(time_range),),
            )
            rows = cursor.fetchall()

        type_names = {
            "policy": "政策",
            "funding": "融资",
            "product": "产品发布",
            "ma": "并购",
            "tech": "技术突破",
            "report": "财报",
            "person": "人物",
            "other": "其他",
        }

        events = []
        for row in rows:
            events.append({
                "id": row["id"],
                "date": row["date"].strftime("%Y-%m-%d") if row["date"] else "",
                "title": row["title"],
                "summary": row["summary"] or "",
                "source": row["source"] or "",
                "source_icon": (row["source"] or "")[:2],
                "type": row["type"],
                "type_name": type_names.get(row["type"], "其他"),
                "ai_commentary": row["ai_commentary"] or "",
                "url": row["url"] or "",
                "keyword": row["keyword"] or "",
            })

        return {
            "success": True,
            "data": {
                "keyword": "全部",
                "time_range": time_range,
                "total_count": len(events),
                "events": events,
            },
        }

    def get_all_type_stats(self, time_range: str = "month") -> Dict:
        """获取所有事件的类型统计"""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT event_type, COUNT(*) as count
                FROM events
                WHERE publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                GROUP BY event_type
                """,
                (self._time_range_to_days(time_range),),
            )
            rows = cursor.fetchall()

        type_names = {
            "policy": "政策",
            "funding": "融资",
            "product": "产品发布",
            "ma": "并购",
            "tech": "技术突破",
            "report": "财报",
            "person": "人物",
            "other": "其他",
        }

        types = [
            {"type": row["event_type"], "name": type_names.get(row["event_type"], "其他"), "count": row["count"]}
            for row in rows
        ]
        total = sum(t["count"] for t in types)

        return {"success": True, "types": types, "total": total}

processor = TimelineProcessor()

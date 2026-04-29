from typing import Dict
from datetime import date, datetime
from app.database import get_db_cursor

def _period_to_days(period: str) -> int:
    ranges = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    return ranges.get(period, 30)

class TimelineProcessor:
    async def generate_timeline(self, keyword: str, time_range: str, page: int = 1, page_size: int = 20) -> Dict:
        """从数据库获取时间轴数据，支持分页"""
        days = self._time_range_to_days(time_range)
        with get_db_cursor() as cursor:
            # 获取总数
            cursor.execute(
                """
                SELECT COUNT(*) as total
                FROM events
                WHERE keyword = %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                """,
                (keyword, days),
            )
            total = cursor.fetchone()["total"]

            # 分页查询
            offset = (page - 1) * page_size
            cursor.execute(
                """
                SELECT id, title, url, source, publish_date as date, summary,
                       ai_commentary, event_type as type, keyword
                FROM events
                WHERE keyword = %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                ORDER BY publish_date DESC
                LIMIT %s OFFSET %s
                """,
                (keyword, days, page_size, offset),
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

        if not events and total == 0:
            return {
                "success": False,
                "error": "未找到相关事件，请尝试其他关键词",
            }

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "success": True,
            "data": {
                "keyword": keyword,
                "time_range": time_range,
                "total_count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
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

    def search_by_source(self, source_name: str, time_range: str, page: int = 1, page_size: int = 20) -> Dict:
        """按来源名称搜索事件，支持分页"""
        with get_db_cursor() as cursor:
            # 先查找匹配的来源
            cursor.execute(
                "SELECT name FROM sources WHERE name LIKE %s LIMIT 1",
                (f"%{source_name}%",),
            )
            source_row = cursor.fetchone()

            if not source_row:
                return {
                    "success": False,
                    "error": f"未找到名称包含 '{source_name}' 的来源",
                }

            matched_source_name = source_row["name"]

            # 获取总数
            cursor.execute(
                """
                SELECT COUNT(*) as total
                FROM events
                WHERE source = %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                """,
                (matched_source_name, self._time_range_to_days(time_range)),
            )
            total = cursor.fetchone()["total"]

            # 分页查询
            offset = (page - 1) * page_size
            cursor.execute(
                """
                SELECT id, title, url, source, publish_date as date, summary,
                       ai_commentary, event_type as type, keyword
                FROM events
                WHERE source = %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                ORDER BY publish_date DESC
                LIMIT %s OFFSET %s
                """,
                (matched_source_name, self._time_range_to_days(time_range), page_size, offset),
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

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "success": True,
            "data": {
                "keyword": f"来源: {matched_source_name}",
                "time_range": time_range,
                "total_count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "events": events,
            },
        }

    def search_by_person(self, person_name: str, time_range: str, page: int = 1, page_size: int = 20) -> Dict:
        """按人名模糊搜索事件，支持分页"""
        with get_db_cursor() as cursor:
            # 获取总数
            cursor.execute(
                """
                SELECT COUNT(*) as total
                FROM events
                WHERE title LIKE %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                """,
                (f"%{person_name}%", self._time_range_to_days(time_range)),
            )
            total = cursor.fetchone()["total"]

            # 分页查询
            offset = (page - 1) * page_size
            cursor.execute(
                """
                SELECT id, title, url, source, publish_date as date, summary,
                       ai_commentary, event_type as type, keyword
                FROM events
                WHERE title LIKE %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                ORDER BY publish_date DESC
                LIMIT %s OFFSET %s
                """,
                (f"%{person_name}%", self._time_range_to_days(time_range), page_size, offset),
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

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "success": True,
            "data": {
                "keyword": f"人物: {person_name}",
                "time_range": time_range,
                "total_count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "events": events,
            },
        }

    def get_all_events(self, time_range: str = "month", page: int = 1, page_size: int = 20) -> Dict:
        """获取所有产业的事件，支持分页"""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) as total
                FROM events
                WHERE publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                """,
                (self._time_range_to_days(time_range),),
            )
            total = cursor.fetchone()["total"]

            offset = (page - 1) * page_size
            cursor.execute(
                """
                SELECT id, title, url, source, publish_date as date, summary,
                       ai_commentary, event_type as type, keyword
                FROM events
                WHERE publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                ORDER BY publish_date DESC
                LIMIT %s OFFSET %s
                """,
                (self._time_range_to_days(time_range), page_size, offset),
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
                "total_count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
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

    def get_insight_stats(self, track: str, period: str) -> Dict:
        """获取统计卡片数据"""
        days = _period_to_days(period)
        keyword = track

        with get_db_cursor() as cursor:
            # 当前周期内容量
            cursor.execute(
                """
                SELECT COUNT(*) as count, AVG(sentiment_score) as avg_sentiment
                FROM events
                WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                """,
                (keyword, days),
            )
            row = cursor.fetchone()
            current_count = row["count"] or 0
            current_sentiment = float(row["avg_sentiment"] or 0.5) * 100

            # 上一周期内容量（用于计算变化率）
            cursor.execute(
                """
                SELECT COUNT(*) as count
                FROM events
                WHERE keyword = %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                AND publish_date < DATE_SUB(CURDATE(), INTERVAL %s DAY)
                """,
                (keyword, days * 2, days),
            )
            prev_count = cursor.fetchone()["count"] or 0

            # 信息源数
            cursor.execute(
                """
                SELECT COUNT(DISTINCT source) as source_count
                FROM events
                WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                """,
                (keyword, days),
            )
            source_count = cursor.fetchone()["source_count"] or 0

            # 信息源变化率
            cursor.execute(
                """
                SELECT COUNT(DISTINCT source) as source_count
                FROM events
                WHERE keyword = %s
                AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                AND publish_date < DATE_SUB(CURDATE(), INTERVAL %s DAY)
                """,
                (keyword, days * 2, days),
            )
            prev_source_count = cursor.fetchone()["source_count"] or 0

        # 计算变化率
        content_change = ((current_count - prev_count) / prev_count * 100) if prev_count > 0 else 0.0
        source_change = ((source_count - prev_source_count) / prev_source_count * 100) if prev_source_count > 0 else 0.0

        # 热点指数 = 内容数标准化 * 0.4 + 情感 * 0.3 + 源数标准化 * 0.3
        heat_index = min(100, (current_count / 100 * 40) + (current_sentiment * 0.3) + (source_count * 2))

        # 情感变化（简化：与上一周期对比）
        sentiment_change = 0.0  # 简化版本

        return {
            "success": True,
            "data": {
                "content_count": current_count,
                "content_count_change": round(content_change, 1),
                "source_count": source_count,
                "source_count_change": round(source_change, 1),
                "sentiment_index": round(current_sentiment, 1),
                "sentiment_change": round(sentiment_change, 1),
                "heat_index": round(heat_index, 1),
                "heat_rank": 1,
            },
        }

    def get_insight_trends(self, track: str, period: str) -> Dict:
        """获取内容趋势数据"""
        days = _period_to_days(period)
        keyword = track

        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT DATE(publish_date) as date,
                       SUM(CASE WHEN sentiment_score >= 0.5 THEN 1 ELSE 0 END) as positive,
                       SUM(CASE WHEN sentiment_score < 0.5 THEN 1 ELSE 0 END) as negative
                FROM events
                WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                GROUP BY DATE(publish_date)
                ORDER BY date ASC
                """,
                (keyword, days),
            )
            rows = cursor.fetchall()

        trends = []
        for row in rows:
            trends.append({
                "date": row["date"].strftime("%m-%d") if row["date"] else "",
                "positive": row["positive"] or 0,
                "negative": row["negative"] or 0,
            })

        return {
            "success": True,
            "data": {
                "period": period,
                "trends": trends,
            },
        }

    def get_insight_distribution(self, track: str, period: str) -> Dict:
        """获取内容分布数据"""
        days = _period_to_days(period)
        keyword = track

        type_names = {
            "policy": ("政策利好", "#059669"),
            "funding": ("投资融资", "#2563EB"),
            "tech": ("技术突破", "#7C3AED"),
            "product": ("产品发布", "#DB2777"),
            "ma": ("并购重组", "#D97706"),
            "report": ("财报业绩", "#0891B2"),
            "person": ("人事变动", "#4B5563"),
            "other": ("其他", "#9CA3AF"),
        }

        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT event_type, COUNT(*) as count
                FROM events
                WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                GROUP BY event_type
                """,
                (keyword, days),
            )
            rows = cursor.fetchall()

        total = sum(row["count"] for row in rows)
        categories = []
        positive_count = 0

        for row in rows:
            name, color = type_names.get(row["event_type"], ("其他", "#9CA3AF"))
            count = row["count"]
            pct = (count / total * 100) if total > 0 else 0
            categories.append({
                "name": name,
                "color": color,
                "percentage": round(pct, 1),
                "count": count,
            })
            if row["event_type"] in ("policy", "funding", "product"):
                positive_count += count

        positive_rate = (positive_count / total * 100) if total > 0 else 0

        return {
            "success": True,
            "data": {
                "positive_rate": round(positive_rate, 1),
                "categories": categories,
            },
        }

    def get_insight_comparison(self) -> Dict:
        """获取赛道对比数据 - 动态查询有事件的赛道"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT keyword, COUNT(*) as count,
                       AVG(sentiment_score) as avg_sentiment
                FROM events
                WHERE publish_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                AND keyword IS NOT NULL AND keyword != ''
                GROUP BY keyword
            """, ())
            rows = cursor.fetchall()

            # 获取 industries 表的颜色映射
            cursor.execute("SELECT name, color FROM industries")
            industry_colors = {row["name"]: row["color"] for row in cursor.fetchall()}

        tracks = []
        for row in rows:
            name = row["keyword"]
            count = row["count"] or 0
            sentiment = float(row["avg_sentiment"] or 0.5) * 100
            heat = min(100, (count / 100 * 40) + (sentiment * 0.3) + 20)
            tracks.append({
                "id": name,
                "name": name,
                "color": industry_colors.get(name, "#6B7280"),
                "content_count": count,
                "heat_index": round(heat, 1),
                "trend": 0.0,
            })

        # 按热度排序
        tracks.sort(key=lambda x: x["heat_index"], reverse=True)
        for i, t in enumerate(tracks):
            t["trend"] = round(5.0 - i * 0.8, 1)

        return {"success": True, "data": {"tracks": tracks}}

    def get_insight_activities(self, track: str, limit: int = 5) -> Dict:
        """获取最新动态"""
        keyword = track

        type_names = {
            "policy": "政策",
            "funding": "融资",
            "product": "产品",
            "ma": "并购",
            "tech": "技术",
            "report": "财报",
            "person": "人事",
            "other": "其他",
        }

        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, source, publish_date, event_type
                FROM events
                WHERE keyword = %s
                ORDER BY publish_date DESC, crawled_at DESC
                LIMIT %s
                """,
                (keyword, limit),
            )
            rows = cursor.fetchall()

        activities = []
        for row in rows:
            now = datetime.now()
            publish_date = row["publish_date"]
            if isinstance(publish_date, date) and not isinstance(publish_date, datetime):
                publish_date = datetime.combine(publish_date, datetime.min.time())
            diff = now - (publish_date or now)
            if diff.days > 0:
                time_ago = f"{diff.days}天前"
            elif diff.seconds >= 3600:
                time_ago = f"{diff.seconds // 3600}小时前"
            else:
                time_ago = f"{max(1, diff.seconds // 60)}分钟前"

            activities.append({
                "id": str(row["id"]),
                "type": row["event_type"],
                "type_name": type_names.get(row["event_type"], "其他"),
                "title": row["title"],
                "source": row["source"] or "未知来源",
                "time_ago": time_ago,
            })

        return {
            "success": True,
            "data": {"activities": activities},
        }

processor = TimelineProcessor()

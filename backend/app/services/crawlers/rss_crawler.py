import feedparser
import logging
import random
import re
from datetime import datetime, timedelta
from typing import List, Dict

from app.services.crawlers.base import CrawlerBase

logger = logging.getLogger(__name__)


class RSSCrawler(CrawlerBase):
    """RSS/Atom 订阅源爬取器"""

    def _calculate_date_range(self, time_range: str) -> datetime:
        now = datetime.now()
        ranges = {
            "week": 7, "month": 30, "quarter": 90,
            "halfyear": 180, "year": 365,
        }
        days = ranges.get(time_range, 30)
        return now - timedelta(days=days)

    def _get_source_icon(self, source_name: str) -> str:
        return source_name[:2]

    def _classify_event(self, title: str, summary: str) -> Dict[str, str]:
        text = (title + summary).lower()
        type_keywords = {
            "policy": ["政策", "工信部", "发改委", "监管", "规划", "文件", "部"],
            "funding": ["融资", "投资", "轮", "估值", "亿美元", "亿元", "资金"],
            "product": ["发布", "推出", "上线", "产品", "新版本"],
            "ma": ["收购", "并购", "合并", "战略合作"],
            "tech": ["突破", "技术", "研发", "芯片", "算法"],
            "report": ["财报", "营收", "业绩", "季度", "亏损", "盈利"],
            "person": ["CEO", "创始人", "高管", "离职", "加盟", "任命"],
        }
        for event_type, keywords in type_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    return {"type": event_type}
        return {"type": "other"}

    def _filter_by_keyword(self, entry: Dict, keyword: str) -> bool:
        title = entry.get("title", "").lower()
        summary = entry.get("summary", "").lower()
        keyword_lower = keyword.lower()
        if keyword_lower in title or keyword_lower in summary:
            return True
        keyword_chars = list(keyword_lower)
        match_count = sum(1 for c in keyword_chars if c in title or c in summary)
        return match_count >= len(keyword_chars) * 0.6

    async def crawl(self, keyword: str, time_range: str) -> List[Dict]:
        """从 source.url 拉取 RSS 并过滤"""
        import httpx
        start_date = self._calculate_date_range(time_range)
        all_events = []

        async with httpx.AsyncClient(
            timeout=30.0,
            headers={"User-Agent": "Mozilla/5.0 (compatible; IndustryPulse/1.0)"},
            follow_redirects=True,
        ) as client:
            try:
                url = self.source.url
                if not url:
                    logger.warning(f"[RSS] No URL for source: {self.source.name}")
                    return []

                response = await client.get(url)
                if response.status_code == 403:
                    logger.warning(f"[RSS] 403 Forbidden, skipping {self.source.name}: {url}")
                    return []
                if response.status_code != 200:
                    logger.error(f"[RSS] HTTP {response.status_code} for {self.source.name}: {url}")
                    return []

                feed = feedparser.parse(response.text)
                if not feed.entries:
                    logger.warning(f"[RSS] No entries in feed for {self.source.name}: {url}")
                    return []
                logger.info(f"[RSS] Fetched {self.source.name}: status={response.status_code} entries={len(feed.entries)}")
                for entry in feed.entries[:50]:
                    if not self._filter_by_keyword(entry, keyword):
                        continue

                    publish_date = None
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        publish_date = datetime(*entry.published_parsed[:6])
                        if publish_date < start_date:
                            continue
                    elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                        publish_date = datetime(*entry.updated_parsed[:6])

                    summary = ""
                    if hasattr(entry, "summary"):
                        summary = entry.summary[:500] if entry.summary else ""
                    elif hasattr(entry, "description"):
                        summary = entry.description[:500] if entry.description else ""
                    summary = re.sub(r'<[^>]+>', '', summary)

                    type_info = self._classify_event(entry.title, summary)

                    event = {
                        "id": entry.id if hasattr(entry, "id") else f"{self.source.name}_{hash(entry.title)}",
                        "title": entry.title[:500],
                        "url": entry.link if hasattr(entry, "link") else "",
                        "source": self.source.name,
                        "source_icon": self._get_source_icon(self.source.name),
                        "publish_date": publish_date.strftime("%Y-%m-%d") if publish_date else datetime.now().strftime("%Y-%m-%d"),
                        "summary": summary[:200],
                        "event_type": type_info["type"],
                        "keyword": keyword,
                    }
                    all_events.append(event)

                logger.info(f"[RSS] source={self.source.name} matched={len(all_events)}")

            except Exception as e:
                logger.error(f"[RSS] Error crawling {self.source.name}: {e}")

        all_events.sort(key=lambda x: x["publish_date"], reverse=True)
        return all_events
import feedparser
import httpx
import logging
import logging.handlers
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict
from app.config import settings

LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
file_handler = logging.handlers.RotatingFileHandler(
    LOG_DIR / "crawler.log", maxBytes=10*1024*1024, backupCount=5
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger.addHandler(file_handler)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('[%(name)s] %(message)s'))
logger.addHandler(console_handler)

class RSSCrawler:
    def __init__(self):
        self.sources = settings.rss_sources

    def _calculate_date_range(self, time_range: str) -> datetime:
        """计算日期范围"""
        now = datetime.now()
        ranges = {
            "week": 7,
            "month": 30,
            "quarter": 90,
            "halfyear": 180,
            "year": 365,
        }
        days = ranges.get(time_range, 30)
        return now - timedelta(days=days)

    def _get_source_icon(self, source_name: str) -> str:
        """获取来源图标（取首字符）"""
        return source_name[:2]

    def _classify_event(self, title: str, summary: str) -> Dict[str, str]:
        """基于关键词匹配判断事件类型"""
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
        """判断条目是否与关键词相关"""
        title = entry.get("title", "").lower()
        summary = entry.get("summary", "").lower()
        keyword_lower = keyword.lower()

        if keyword_lower in title or keyword_lower in summary:
            return True

        keyword_chars = list(keyword_lower)
        match_count = sum(1 for c in keyword_chars if c in title or c in summary)
        if match_count >= len(keyword_chars) * 0.6:
            return True

        return False

    async def crawl(self, keyword: str, time_range: str) -> List[Dict]:
        """爬取RSS源并过滤"""
        start_date = self._calculate_date_range(time_range)
        all_events = []

        async with httpx.AsyncClient(
            timeout=30.0,
            headers={"User-Agent": "Mozilla/5.0 (compatible; IndustryPulse/1.0)"}
        ) as client:
            for source in self.sources:
                try:
                    response = await client.get(source["url"])
                    logger.info(f"[RSS] fetching url={source['url']} status={response.status_code}")
                    if response.status_code == 403:
                        logger.warning(f"[RSS] 403 Forbidden, skipping {source['name']}: {source['url']}")
                        continue
                    if response.status_code != 200:
                        logger.error(f"[RSS] HTTP error {response.status_code} for {source['name']}: {source['url']}")
                        continue
                    response.raise_for_status()

                    feed = feedparser.parse(response.text)
                    source_count = 0
                    logger.info(f"[RSS] source={source['name']} feed_entries={len(feed.entries) if feed.entries else 0}")

                    for entry in feed.entries[:50]:
                        source_count += 1
                        if random.random() < 0.1:
                            logger.info(f"[RSS] source={source['name']} entry={entry}}}")

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

                        import re
                        summary = re.sub(r'<[^>]+>', '', summary)

                        type_info = self._classify_event(entry.title, summary)

                        event = {
                            "id": entry.id if hasattr(entry, "id") else f"{source['name']}_{hash(entry.title)}",
                            "title": entry.title[:500],
                            "url": entry.link if hasattr(entry, "link") else "",
                            "source": source["name"],
                            "source_icon": self._get_source_icon(source["name"]),
                            "publish_date": publish_date.strftime("%Y-%m-%d") if publish_date else datetime.now().strftime("%Y-%m-%d"),
                            "summary": summary[:200],
                            "event_type": type_info["type"],
                            "keyword": keyword,
                        }
                        all_events.append(event)

                    logger.info(f"[RSS] source={source['name']} entries={source_count} matched={sum(1 for e in all_events if e['source'] == source['name'])}")

                except httpx.HTTPError as e:
                    logger.error(f"[RSS] HTTP error for {source['name']}: {e}")
                    continue
                except Exception as e:
                    logger.error(f"[RSS] Error crawling {source['name']}: {e}")
                    continue

        all_events.sort(key=lambda x: x["publish_date"], reverse=True)
        logger.info(f"[Crawl] keyword={keyword} total_fetched={len(all_events)}")
        return all_events

crawler = RSSCrawler()

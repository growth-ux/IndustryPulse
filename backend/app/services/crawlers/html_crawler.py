import httpx
import logging
import re
from datetime import datetime, timedelta
from typing import List, Dict
from bs4 import BeautifulSoup
from app.services.crawlers.base import CrawlerBase

logger = logging.getLogger(__name__)


class HTMLCrawler(CrawlerBase):
    """普通网页爬取器，按 CSS selector 解析文章列表"""

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

    def _filter_by_keyword(self, title: str, summary: str, keyword: str) -> bool:
        text = (title + summary).lower()
        keyword_lower = keyword.lower()
        if keyword_lower in text:
            return True
        keyword_chars = list(keyword_lower)
        match_count = sum(1 for c in keyword_chars if c in text)
        return match_count >= len(keyword_chars) * 0.6

    async def crawl(self, keyword: str, time_range: str) -> List[Dict]:
        """按 selector 解析网页，提取文章标题和链接"""
        start_date = self._calculate_date_range(time_range)
        all_events = []

        url = self.source.url
        list_selector = self.source.list_selector
        title_selector = self.source.title_selector

        if not url:
            logger.warning(f"[HTML] No URL for source: {self.source.name}")
            return []

        if not list_selector or not title_selector:
            logger.warning(f"[HTML] Missing selectors for {self.source.name}, skipping")
            return []

        try:
            async with httpx.AsyncClient(
                timeout=30.0,
                headers={"User-Agent": "Mozilla/5.0 (compatible; IndustryPulse/1.0)"}
            ) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    logger.error(f"[HTML] HTTP {response.status_code} for {self.source.name}")
                    return []

                soup = BeautifulSoup(response.text, 'html.parser')
                article_elements = soup.select(list_selector)

                for elem in article_elements[:30]:
                    title_elem = elem.select_one(title_selector)
                    if not title_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    link = title_elem.get('href') if title_elem.name == 'a' else title_elem.find_parent('a').get('href') if title_elem.find_parent('a') else ""

                    if not title:
                        continue

                    if not self._filter_by_keyword(title, "", keyword):
                        continue

                    type_info = self._classify_event(title, "")

                    date_text = ""
                    date_elem = elem.find(class_=re.compile(r'date|time|publish')) or elem.find_parent('div')
                    if date_elem:
                        date_text = date_elem.get_text(strip=True)[:50]

                    event = {
                        "id": f"{self.source.name}_{hash(title)}",
                        "title": title[:500],
                        "url": link if link.startswith('http') else (url.rstrip('/') + '/' + link.lstrip('/')) if link else url,
                        "source": self.source.name,
                        "source_icon": self._get_source_icon(self.source.name),
                        "publish_date": datetime.now().strftime("%Y-%m-%d"),
                        "summary": date_text,
                        "event_type": type_info["type"],
                        "keyword": keyword,
                    }
                    all_events.append(event)

                logger.info(f"[HTML] source={self.source.name} matched={len(all_events)}")

        except Exception as e:
            logger.error(f"[HTML] Error crawling {self.source.name}: {e}")

        all_events.sort(key=lambda x: x["publish_date"], reverse=True)
        return all_events
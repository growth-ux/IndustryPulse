from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from app.models.schema import Source, CrawlType


class CrawlerBase(ABC):
    """爬虫基类，所有爬虫必须实现 crawl 方法"""

    def __init__(self, source: Source):
        self.source = source

    @abstractmethod
    async def crawl(self, keyword: str, time_range: str) -> List[Dict]:
        """
        爬取 source 并返回与 keyword 相关的事件列表
        :param keyword: 关键词，用于过滤
        :param time_range: 时间范围 (week/month/quarter/halfyear/year)
        :return: 事件列表，格式为 [{id, title, url, source, ...}, ...]
        """
        pass


class CrawlerFactory:
    """爬虫工厂，根据 source.crawl_type 创建对应爬虫"""

    @staticmethod
    def create(source: Source) -> CrawlerBase:
        if source.crawl_type == CrawlType.RSS:
            from app.services.crawlers.rss_crawler import RSSCrawler
            return RSSCrawler(source)
        elif source.crawl_type == CrawlType.HTML:
            from app.services.crawlers.html_crawler import HTMLCrawler
            return HTMLCrawler(source)
        else:
            raise ValueError(f"Unknown crawl_type: {source.crawl_type}")

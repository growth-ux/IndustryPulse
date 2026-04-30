import asyncio
import logging
import logging.handlers
import random
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.services.ai import ai_service
from app.database import get_db_cursor

MAX_EVENTS_PER_RUN = 20  # 每次最多处理条数
MAX_CONCURRENCY = 5     # 并发数

# 配置日志到文件
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
file_handler = logging.handlers.RotatingFileHandler(
    'logs/scheduler.log', maxBytes=10*1024*1024, backupCount=5
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger.addHandler(file_handler)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('[%(name)s] %(message)s'))
logger.addHandler(console_handler)

class PeriodicCrawler:
    """定时爬取任务执行器"""

    def run(self):
        """执行一次完整的爬取流程"""
        def _run_in_thread():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(self._run_async())
            finally:
                loop.close()

        import threading
        t = threading.Thread(target=_run_in_thread)
        t.start()
        t.join()

    async def _run_async(self):
        keywords = self._get_keywords()
        sources = self._get_sources()  # 新增：从数据库读

        for keyword in keywords:
            for source in sources:
                await self._crawl_keyword_source(keyword, source)

    def _get_keywords(self):
        """从数据库获取所有关键词"""
        with get_db_cursor() as cursor:
            cursor.execute("SELECT name FROM industries", ())
            rows = cursor.fetchall()
        return [row["name"] for row in rows]

    def _get_sources(self):
        """从数据库获取所有启用的订阅源"""
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM sources WHERE enabled = TRUE")
            rows = cursor.fetchall()

        from app.models.schema import Source, CrawlType
        sources = []
        for row in rows:
            sources.append(Source(
                id=row['id'],
                name=row['name'],
                category=row['category'],
                url=row.get('url'),
                description=row.get('description'),
                enabled=bool(row['enabled']),
                article_count=row.get('article_count', 0),
                last_update=row.get('last_update').isoformat() if row.get('last_update') else None,
                crawl_type=CrawlType(row.get('crawl_type', 'rss')),
                list_selector=row.get('list_selector'),
                title_selector=row.get('title_selector'),
            ))
        return sources

    async def _crawl_keyword_source(self, keyword: str, source):
        """爬取单个关键词+订阅源组合"""
        try:
            logger.info(f"[Crawl] Starting keyword={keyword} source={source.name} url={source.url} type={source.crawl_type}")
            from app.services.crawlers import CrawlerFactory
            crawler = CrawlerFactory.create(source)
            events = await crawler.crawl(keyword, "month")
            logger.info(f"[Crawl] Completed keyword={keyword} source={source.name} events_count={len(events)}")
            events = events[:MAX_EVENTS_PER_RUN]

            semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

            async def process_event(event):
                async with semaphore:
                    ai_commentary = await ai_service.generate_commentary(
                        event["title"],
                        event["summary"],
                        event["event_type"],
                    )
                    event["ai_commentary"] = ai_commentary
                    self._save_event(event, keyword)

            await asyncio.gather(*[process_event(e) for e in events])
            logger.info(f"Processed {len(events)} events for {keyword} from {source.name}")
        except Exception as e:
            logger.error(f"Error crawling {keyword}/{source.name}: {e}")

    def _save_event(self, event, keyword: str):
        """保存事件到数据库"""
        from datetime import datetime
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
                        event.get("id") or f"{keyword}:{event.get('url', '')}:{event.get('publish_date', '')}",
                        keyword,
                        event.get("title", ""),
                        event.get("url", ""),
                        event.get("source", ""),
                        event.get("publish_date", ""),
                        event.get("summary", ""),
                        event.get("ai_commentary", ""),
                        event.get("event_type", "other"),
                        0.5,
                        datetime.now(),
                    ),
                )
        except Exception as e:
            logger.error(f"Error saving event: {e}")

class SchedulerService:
    """调度器服务，管理 APScheduler 生命周期"""

    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.crawler = PeriodicCrawler()

    def start(self):
        """启动调度器"""
        from app.config import settings
        interval = settings.scheduled_crawl_interval_minutes

        self.scheduler.add_job(
            self.crawler.run,
            trigger=IntervalTrigger(minutes=interval),
            id="periodic_crawl",
            name="定时爬取RSS并写入数据库",
            replace_existing=True,
        )
        self.scheduler.start()
        logger.info(f"Scheduler started with {interval} minutes interval")

    def stop(self):
        """停止调度器"""
        self.scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")

scheduler_service = SchedulerService()

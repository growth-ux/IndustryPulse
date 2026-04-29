# 订阅源爬取框架实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把硬编码的 RSS 源配置替换为从数据库 `sources` 表读取，支持 RSS 和 HTML 两种爬取策略。

**Architecture:** 策略模式爬虫工厂 — 根据 `sources.crawl_type` 创建 `RSSCrawler` 或 `HTMLCrawler`，统一接口输出事件列表。

**Tech Stack:** Python (feedparser, httpx, BeautifulSoup), FastAPI, MySQL

---

## File Structure

```
backend/
├── init_db.sql                          # 修改：sources 表加字段
├── app/
│   ├── models/schema.py                 # 修改：Source 模型加字段
│   ├── api/timeline.py                  # 修改：sources API 支持新字段
│   └── services/
│       ├── crawler.py                   # 废弃：逻辑迁移到 crawlers/
│       ├── scheduler.py                # 修改：从 DB 读 sources
│       └── crawlers/                    # 新建目录
│           ├── __init__.py
│           ├── base.py                  # 抽象基类 + CrawlerFactory
│           ├── rss_crawler.py           # RSS 爬取器
│           └── html_crawler.py          # HTML 爬取器

frontend/src/
├── types/source.ts                      # 修改：CrawlType 类型
├── services/api.ts                      # 修改：Source 接口加字段
└── components/SourceManager.tsx         # 修改：添加订阅源表单加 crawl_type
```

---

## Task 1: 数据库 Migration

**Files:**
- Modify: `backend/init_db.sql:83-103`（INSERT 语句后的 ON DUPLICATE KEY UPDATE）

- [ ] **Step 1: 添加 ALTER TABLE 语句**

在 `init_db.sql` 中 sources 表定义之后，INSERT 语句之前，添加：

```sql
-- 订阅源爬取配置
ALTER TABLE sources ADD COLUMN crawl_type ENUM('rss', 'html') DEFAULT 'rss';
ALTER TABLE sources ADD COLUMN list_selector VARCHAR(255) DEFAULT NULL;
ALTER TABLE sources ADD COLUMN title_selector VARCHAR(255) DEFAULT NULL;
```

- [ ] **Step 2: 更新 INSERT 语句的 ON DUPLICATE KEY UPDATE**

在 `init_db.sql:103` 的 `ON DUPLICATE KEY UPDATE name=VALUES(name)` 后追加：

```sql
, crawl_type=VALUES(crawl_type)
, list_selector=VALUES(list_selector)
, title_selector=VALUES(title_selector)
```

- [ ] **Step 3: 更新现有数据的 crawl_type**

在 ALTER TABLE 之后、INSERT 之前添加迁移 SQL：

```sql
-- 将官方类源设为 html（selector 待后续配置）
UPDATE sources SET crawl_type = 'html' WHERE category = 'official';
```

---

## Task 2: 更新 Pydantic Schema

**Files:**
- Modify: `backend/app/models/schema.py:81-115`

- [ ] **Step 1: 添加 CrawlType Enum**

在 `SourceCategory` 之后、`Source` 之前添加：

```python
class CrawlType(str, Enum):
    RSS = "rss"
    HTML = "html"
```

- [ ] **Step 2: 给 Source 模型加字段**

修改 `backend/app/models/schema.py:88-96` 的 `Source` 类：

```python
class Source(BaseModel):
    id: int
    name: str
    category: str
    url: Optional[str] = None
    description: Optional[str] = None
    enabled: bool = True
    article_count: int = 0
    last_update: Optional[str] = None
    crawl_type: CrawlType = CrawlType.RSS  # 新增
    list_selector: Optional[str] = None     # 新增（html 用）
    title_selector: Optional[str] = None    # 新增（html 用）
```

- [ ] **Step 3: 更新 AddSourceRequest**

修改 `backend/app/models/schema.py:103-107`：

```python
class AddSourceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="来源名称")
    category: SourceCategory
    url: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    crawl_type: CrawlType = CrawlType.RSS  # 新增
    list_selector: Optional[str] = None    # 新增
    title_selector: Optional[str] = None   # 新增
```

- [ ] **Step 4: 更新 UpdateSourceRequest**

修改 `backend/app/models/schema.py:109-114`：

```python
class UpdateSourceRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[SourceCategory] = None
    url: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    enabled: Optional[bool] = None
    crawl_type: Optional[CrawlType] = None  # 新增
    list_selector: Optional[str] = None     # 新增
    title_selector: Optional[str] = None    # 新增
```

---

## Task 3: 创建爬虫工厂和基类

**Files:**
- Create: `backend/app/services/crawlers/__init__.py`
- Create: `backend/app/services/crawlers/base.py`

- [ ] **Step 1: 创建 crawlers 目录的 __init__.py**

```python
from app.services.crawlers.base import CrawlerFactory, CrawlerBase

__all__ = ['CrawlerFactory', 'CrawlerBase']
```

- [ ] **Step 2: 创建 base.py — 抽象基类和工厂**

```python
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
```

---

## Task 4: 实现 RSSCrawler

**Files:**
- Create: `backend/app/services/crawlers/rss_crawler.py`

- [ ] **Step 1: 从现有 crawler.py 提取 RSS 逻辑**

创建 `backend/app/services/crawlers/rss_crawler.py`：

```python
import feedparser
import logging
import random
import re
from datetime import datetime, timedelta
from typing import List, Dict

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
            headers={"User-Agent": "Mozilla/5.0 (compatible; IndustryPulse/1.0)"}
        ) as client:
            try:
                url = self.source.url
                if not url:
                    logger.warning(f"[RSS] No URL for source: {self.source.name}")
                    return []

                response = await client.get(url)
                if response.status_code == 403:
                    logger.warning(f"[RSS] 403 Forbidden, skipping {self.source.name}")
                    return []
                if response.status_code != 200:
                    logger.error(f"[RSS] HTTP {response.status_code} for {self.source.name}")
                    return []

                feed = feedparser.parse(response.text)
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
```

---

## Task 5: 实现 HTMLCrawler

**Files:**
- Create: `backend/app/services/crawlers/html_crawler.py`

- [ ] **Step 1: 创建 HTML 爬取器**

```python
import httpx
import logging
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bs4 import BeautifulSoup

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

                    # 尝试从元素或父元素提取日期
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
```

---

## Task 6: 修改 scheduler.py 从数据库读 sources

**Files:**
- Modify: `backend/app/services/scheduler.py:30-115`

- [ ] **Step 1: 更新 PeriodicCrawler**

将 `PeriodicCrawler` 的 `run()` 方法改为从数据库读 sources：

```python
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
            from app.services.crawlers import CrawlerFactory
            crawler = CrawlerFactory.create(source)
            events = await crawler.crawl(keyword, "month")
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
```

- [ ] **Step 2: 移除旧的 crawler 导入**

删除 `scheduler.py:7` 的 `from app.services.crawler import crawler`，因为不再使用。

---

## Task 7: 更新 timeline.py 的 sources API

**Files:**
- Modify: `backend/app/api/timeline.py:80-190`

- [ ] **Step 1: 更新 add_source API 支持新字段**

在 `timeline.py:120-132` 的 `add_source` 函数中，将 INSERT 改为：

```python
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
```

- [ ] **Step 2: 更新 update_source API 支持新字段**

在 `timeline.py:134-167` 的 `update_source` 函数中，`updates` 列表追加：

```python
if request.crawl_type is not None:
    updates.append("crawl_type = %s")
    params.append(request.crawl_type.value)
if request.list_selector is not None:
    updates.append("list_selector = %s")
    params.append(request.list_selector)
if request.title_selector is not None:
    updates.append("title_selector = %s")
    params.append(request.title_selector)
```

- [ ] **Step 3: 更新 get_sources 返回新字段**

在 `timeline.py:80-104` 的 `get_sources` 中，`Source` 构建时添加：

```python
crawl_type=row.get('crawl_type', 'rss'),
list_selector=row.get('list_selector'),
title_selector=row.get('title_selector'),
```

---

## Task 8: 前端 Source 接口更新

**Files:**
- Modify: `frontend/src/services/api.ts:97-106`
- Modify: `frontend/src/types/source.ts:1-29`

- [ ] **Step 1: 更新 frontend/src/types/source.ts**

```typescript
export type SourceCategory = 'official' | 'media' | 'academic' | 'social' | 'data'
export type CrawlType = 'rss' | 'html'  // 新增

export interface Source {
  id: number
  name: string
  category: SourceCategory
  description?: string
  enabled: boolean
  article_count: number
  last_update?: string
  url?: string
  crawl_type: CrawlType        // 新增
  list_selector?: string        // 新增
  title_selector?: string       // 新增
}
```

- [ ] **Step 2: 更新 frontend/src/services/api.ts:97-106**

```typescript
export interface Source {
  id: number
  name: string
  category: 'official' | 'media' | 'academic' | 'social' | 'data'
  url?: string
  description?: string
  enabled: boolean
  article_count: number
  last_update?: string
  crawl_type: 'rss' | 'html'    // 新增
  list_selector?: string        // 新增
  title_selector?: string       // 新增
}
```

同时更新 `addSource` 函数参数类型：

```typescript
export async function addSource(data: {
  name: string
  category: string
  url?: string
  description?: string
  crawl_type: 'rss' | 'html'    // 新增
  list_selector?: string        // 新增
  title_selector?: string       // 新增
}): Promise<{ success: boolean; error?: string }>
```

---

## Task 9: 前端 SourceManager 表单增加 crawl_type

**Files:**
- Modify: `frontend/src/components/SourceManager.tsx:23-28`（formData 状态）
- Modify: `frontend/src/components/SourceManager.tsx:335-349`（表单 HTML）

- [ ] **Step 1: 更新 formData 类型**

在 `SourceManager.tsx:23-28` 的 `useState` 中添加字段：

```typescript
const [formData, setFormData] = useState({
  name: '',
  category: '' as SourceCategory | '',
  url: '',
  desc: '',
  crawl_type: 'rss' as 'rss' | 'html',  // 新增
  list_selector: '',                      // 新增
  title_selector: '',                      // 新增
})
```

- [ ] **Step 2: 在添加订阅源表单中增加 crawl_type 选择**

在 `SourceManager.tsx` 的 Modal 表单里，`来源分类` 选择框之后添加：

```tsx
<div className="sm-form-group">
  <label className="sm-form-label">爬取方式</label>
  <select
    className="sm-form-select"
    value={formData.crawl_type}
    onChange={(e) => setFormData(prev => ({ ...prev, crawl_type: e.target.value as 'rss' | 'html' }))}
  >
    <option value="rss">RSS 订阅</option>
    <option value="html">网页爬取</option>
  </select>
</div>
```

- [ ] **Step 3: 条件显示 selector 字段（当 crawl_type === 'html' 时）**

在 `crawl_type` 选择框之后添加：

```tsx
{formData.crawl_type === 'html' && (
  <>
    <div className="sm-form-group">
      <label className="sm-form-label">列表选择器</label>
      <input
        type="text"
        className="sm-form-input"
        placeholder="如：.article-list"
        value={formData.list_selector}
        onChange={(e) => setFormData(prev => ({ ...prev, list_selector: e.target.value }))}
      />
      <p className="sm-form-hint">CSS 选择器定位文章列表容器</p>
    </div>
    <div className="sm-form-group">
      <label className="sm-form-label">标题选择器</label>
      <input
        type="text"
        className="sm-form-input"
        placeholder="如：h3.title a"
        value={formData.title_selector}
        onChange={(e) => setFormData(prev => ({ ...prev, title_selector: e.target.value }))}
      />
      <p className="sm-form-hint">CSS 选择器定位标题和链接</p>
    </div>
  </>
)}
```

- [ ] **Step 4: 更新 handleAddSource**

修改 `handleAddSource` 函数，传递新字段：

```typescript
const result = await addSource({
  name: formData.name,
  category: formData.category,
  url: formData.url || undefined,
  description: formData.desc || undefined,
  crawl_type: formData.crawl_type,      // 新增
  list_selector: formData.list_selector || undefined,  // 新增
  title_selector: formData.title_selector || undefined, // 新增
})
```

- [ ] **Step 5: 更新 form 重置**

`setFormData` 重置时也要包含新字段：

```typescript
setFormData({
  name: '', category: '', url: '', desc: '',
  crawl_type: 'rss',
  list_selector: '',
  title_selector: '',
})
```

---

## 验证清单

- [ ] `init_db.sql` 执行后 `sources` 表有 `crawl_type`, `list_selector`, `title_selector` 字段
- [ ] 现有媒体类源 `crawl_type = 'rss'`，官方类源 `crawl_type = 'html'`
- [ ] `curl http://localhost:8000/api/sources` 返回的 source 对象包含 `crawl_type` 字段
- [ ] POST `/api/sources` 能接受并存储 `crawl_type`、`list_selector`、`title_selector`
- [ ] `scheduler.py` 启动后从数据库读 sources 而非 `config.rss_sources`
- [ ] 前端添加订阅源表单可以选择 `rss` 或 `html`，选 `html` 时显示 selector 输入框
- [ ] RSS 源（36kr 等）可以正常爬取
- [ ] HTML 源（工信部等）可以正常爬取（selector 待在 UI 配置）

---

Plan complete and saved to `docs/superpowers/plans/2026-04-29-source-crawler-plan.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
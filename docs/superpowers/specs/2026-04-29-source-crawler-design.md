# 订阅源爬取框架设计

## 目标

把 `crawler.py` 里的硬编码 RSS 列表替换为从 `sources` 表读取配置，支持 RSS 和 HTML 两种爬取策略，实现可扩展的订阅源爬取框架。

## 现状

- `sources` 表存储订阅源元数据（name, category, url, enabled 等）
- `config.py` 里 `rss_sources` 硬编码了 5 个 RSS 源
- `RSSCrawler.crawl()` 按关键词遍历所有硬编码源，拉取 RSS 后过滤

## 设计

### 数据库改动

`sources` 表新增字段：

```sql
ALTER TABLE sources ADD COLUMN crawl_type ENUM('rss', 'html') DEFAULT 'rss';
ALTER TABLE sources ADD COLUMN list_selector VARCHAR(255) DEFAULT NULL;
ALTER TABLE sources ADD COLUMN title_selector VARCHAR(255) DEFAULT NULL;
```

现有数据迁移：
- 媒体类（36kr、虎嗅、机器之心、财新、第一财经等）→ `crawl_type = 'rss'`
- 官方类（工信部、发改委、证监会）→ `crawl_type = 'html'`，selector 待配置

### 爬虫架构（策略模式）

```
sources 表 (DB)
    ↓
SourceProvider   ← 从数据库读取所有 enabled 的订阅源
    ↓
CrawlerFactory   ← 根据 crawl_type 选择对应爬取器
    ↓
┌─────────────────┬────────────────┐
│   RSSCrawler    │   HTMLCrawler  │
│   (feedparser)  │   (httpx+bs4)  │
└─────────────────┴────────────────┘
    ↓
Event[]  ← 统一格式的事件列表
```

#### CrawlerFactory

```python
class CrawlerFactory:
    @staticmethod
    def create(source: Source):
        if source.crawl_type == 'rss':
            return RSSCrawler(source)
        elif source.crawl_type == 'html':
            return HTMLCrawler(source)
        else:
            raise ValueError(f"Unknown crawl_type: {source.crawl_type}")
```

#### RSSCrawler

复用现有 `feedparser` 逻辑，从 `source.url` 拉取 RSS/Atom，解析后返回事件列表。

#### HTMLCrawler

用 httpx 拉取网页，用 BeautifulSoup 按 CSS selector 解析：
- `list_selector`：定位文章列表容器（如 `.article-list`、`div.news-item`）
- `title_selector`：从每个容器中抽取标题和链接

返回事件列表，格式与 RSSCrawler 相同。

### scheduler.py 改动

`PeriodicCrawler._get_keywords()` 保持不变（从 industries 表读关键词）。

新增 `PeriodicCrawler._get_sources()` 从数据库读取所有 `enabled=True` 的 sources。

主流程：
1. 获取关键词列表
2. 获取所有启用的订阅源
3. 对每个 (关键词, 源) 组合：
   - 用 CrawlerFactory 创建对应爬取器
   - 调用 `crawl(keyword, time_range)` 获取事件
   - 事件按关键词过滤后存入 events 表

### API 扩展

前端"添加订阅源"表单增加 `crawl_type` 选择：
- `rss`：显示 URL 输入框
- `html`：显示 URL + list_selector + title_selector 输入框

## 实现步骤

1. 修改 `init_db.sql`，给 sources 表加字段
2. 更新 `schema.py` 的 Source 模型
3. 创建 `app/services/crawlers/` 目录，包含：
   - `base.py`：定义 Crawler 抽象基类和 CrawlerFactory
   - `rss_crawler.py`：RSSCrawler 实现
   - `html_crawler.py`：HTMLCrawler 实现
4. 修改 `scheduler.py` 的 PeriodicCrawler，从数据库读 sources
5. 更新 `crawler.py`（或废弃，重构到 crawlers/ 目录）
6. 前端表单增加 crawl_type 选择
7. 更新 `timeline.py` 的 PUT/POST sources API，支持新字段

## 错误处理

- 网络超时：跳过该源，记录日志，继续下一个
- 解析失败：返回空列表，记录错误
- 未知 crawl_type：抛出异常，不静默忽略

## 覆盖范围

本设计覆盖：
- RSS 订阅源（36kr、虎嗅、机器之心、财新、第一财经、arXiv 等）
- 普通网页爬取（工信部、发改委、证监会等官方站点）

暂不覆盖：
- API 类数据源（需要单独实现）
- JS 动态渲染页面（需要 headless browser，成本高）
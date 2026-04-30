# Sitemap → RSS 爬虫设计

## 概述

为 HTML 类型订阅源添加 sitemap → RSS 自动转换能力，优先尝试解析 sitemap，失败后自动降级为 HTML 解析模式。

## 架构

### CrawlType 枚举扩展
新增 `SITEMAP` 枚举值，位于 `app/models/schema.py`：
```python
class CrawlType(str, Enum):
    RSS = "rss"
    HTML = "html"
    SITEMAP = "sitemap"
```

### 新建 SitemapCrawler
文件：`backend/app/services/crawlers/sitemap_crawler.py`

实现 `CrawlerBase` 接口，`crawl()` 方法签名与 `RSSCrawler` 完全一致。

### CrawlerFactory 更新
```python
elif source.crawl_type == CrawlType.SITEMAP:
    from app.services.crawlers.sitemap_crawler import SitemapCrawler
    return SitemapCrawler(source)
elif source.crawl_type == CrawlType.HTML:
    # 自动降级：SITEMAP 解析失败后使用 HTMLCrawler
    from app.services.crawlers.html_crawler import HTMLCrawler
    return HTMLCrawler(source)
```

### 降级策略
`sitemap_crawler.py` 内部捕获异常后，调用 `HTMLCrawler` 作为 fallback：
```python
try:
    # sitemap 解析逻辑
except Exception:
    html_crawler = HTMLCrawler(self.source)
    return await html_crawler.crawl(keyword, time_range)
```

## SitemapCrawler 数据流

```
1. 获取 source.url（原始网站 URL，非 sitemap 地址）
2. 构造 sitemap URL：{url.rstrip('/')}/sitemap.xml
3. 请求 sitemap.xml
4. 解析 XML：
   - 若为 <sitemapindex>：取所有 <sitemap><loc>，遍历每个子 sitemap
   - 若为 <urlset>：直接解析 <url> 列表
5. 取前 50 条 <loc> URL
6. 对每条 URL 做关键词匹配（URL path 部分）
7. 返回事件列表
```

## 关键词匹配逻辑

对 sitemap 中的每条 URL：
- 提取 URL 的 path 部分（去掉 domain）
- 检查 path 或 URL 字符串是否包含关键词
- 匹配阈值：URL path 中关键词字符占比 ≥ 60%

若 sitemap 条目无 lastmod 时间，使用当前时间。

## 数据库变更

```sql
ALTER TABLE sources MODIFY COLUMN crawl_type
    ENUM('rss', 'html', 'sitemap') NOT NULL DEFAULT 'rss';
```

将工信部、发改委的 `crawl_type` 从 `html` 更新为 `sitemap`：
```sql
UPDATE sources SET crawl_type = 'sitemap'
WHERE name IN ('工信部官网', '国家发改委', '证监会披露');
```

## 依赖

无新增依赖。使用 Python 内置 `xml.etree.ElementTree` 解析 XML。

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| sitemap.xml 返回 404 | 降级到 HTMLCrawler |
| sitemap.xml 返回非 XML 内容 | 降级到 HTMLCrawler |
| XML 解析失败 | 降级到 HTMLCrawler |
| 无可用 URL 条目 | 返回空列表，不降级 |

## 日志

- `[Sitemap] Fetching sitemap={url} for source={name}`
- `[Sitemap] Parsed {count} URLs from sitemap`
- `[Sitemap] Matched {count} URLs after keyword filter`
- `[Sitemap] Fallback to HTMLCrawler for {name}: {reason}`

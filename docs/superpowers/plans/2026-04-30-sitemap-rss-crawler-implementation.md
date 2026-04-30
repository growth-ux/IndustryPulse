# Sitemap → RSS 爬虫实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 HTML 类型订阅源添加 sitemap → RSS 自动转换能力，优先尝试解析 sitemap，失败后自动降级为 HTML 解析模式。

**Architecture:** 新增 `SitemapCrawler` 实现 `CrawlerBase` 接口，优先解析 sitemap.xml，降级时复用 `HTMLCrawler`。`CrawlType` 枚举新增 `SITEMAP` 值。

**Tech Stack:** Python 内置 `xml.etree.ElementTree` 解析 XML，`httpx` 发送请求。

---

## 文件变更映射

| 文件 | 操作 |
|------|------|
| `backend/app/models/schema.py` | 修改：枚举新增 `SITEMAP` |
| `backend/app/services/crawlers/__init__.py` | 无需修改（import 在 `base.py` 中） |
| `backend/app/services/crawlers/base.py` | 修改：`CrawlerFactory.create()` 新增 `SITEMAP` 分支 |
| `backend/app/services/crawlers/sitemap_crawler.py` | 新建：SitemapCrawler 实现 |
| `backend/app/services/crawlers/html_crawler.py` | 修改：构造函数接受 `sitemap_fallback=True` 参数 |
| `backend/requirements.txt` | 无需修改（使用内置 xml.etree） |

---

## Task 1: 枚举扩展

**Files:**
- Modify: `backend/app/models/schema.py:101-103`

- [ ] **Step 1: 修改 CrawlType 枚举**

```python
class CrawlType(str, Enum):
    RSS = "rss"
    HTML = "html"
    SITEMAP = "sitemap"
```

- [ ] **Step 2: 验证修改**

Run: `cd /Users/tiger/PycharmProjects/IndustryHot/backend && python3 -c "from app.models.schema import CrawlType; print([e.value for e in CrawlType])"`
Expected: `['rss', 'html', 'sitemap']`

---

## Task 2: SitemapCrawler 实现

**Files:**
- Create: `backend/app/services/crawlers/sitemap_crawler.py`

- [ ] **Step 1: 创建 SitemapCrawler 类**

```python
import logging
from datetime import datetime
from typing import List, Dict
import xml.etree.ElementTree as ET
import httpx
from app.services.crawlers.base import CrawlerBase
from app.services.crawlers.html_crawler import HTMLCrawler

logger = logging.getLogger(__name__)

class SitemapCrawler(CrawlerBase):
    """sitemap.xml 解析器，失败后自动降级到 HTMLCrawler"""

    SITEMAP_MAX_URLS = 50

    async def crawl(self, keyword: str, time_range: str) -> List[Dict]:
        """解析 sitemap 并返回与 keyword 相关的 URL 列表"""
        try:
            return await self._crawl_from_sitemap(keyword)
        except Exception as e:
            logger.warning(f"[Sitemap] Fallback to HTMLCrawler for {self.source.name}: {e}")
            html_crawler = HTMLCrawler(self.source)
            return await html_crawler.crawl(keyword, time_range)

    async def _crawl_from_sitemap(self, keyword: str) -> List[Dict]:
        base_url = self.source.url.rstrip('/')
        sitemap_url = f"{base_url}/sitemap.xml"

        logger.info(f"[Sitemap] Fetching {sitemap_url} for {self.source.name}")
        async with httpx.AsyncClient(
            timeout=30.0,
            headers={"User-Agent": "Mozilla/5.0 (compatible; IndustryPulse/1.0)"},
            follow_redirects=True,
        ) as client:
            resp = await client.get(sitemap_url)
            if resp.status_code != 200:
                raise Exception(f"HTTP {resp.status_code}")

            content_type = resp.headers.get("content-type", "")
            if "xml" not in content_type and "xml" not in resp.text[:100]:
                raise Exception(f"Not XML: {content_type}")

            root = ET.fromstring(resp.text)
            namespaces = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

            # 检测是 sitemapindex 还是 urlset
            if root.tag.endswith('sitemapindex'):
                urls = self._parse_sitemapindex(root)
            elif root.tag.endswith('urlset'):
                urls = self._parse_urlset(root)
            else:
                # 尝试不带命名空间解析
                urls = self._parse_urlset_fallback(root)

            logger.info(f"[Sitemap] Parsed {len(urls)} URLs from sitemap for {self.source.name}")

            # 关键词过滤
            matched = [u for u in urls[:self.SITEMAP_MAX_URLS] if self._keyword_matches(u['loc'], keyword)]
            logger.info(f"[Sitemap] Matched {len(matched)} URLs after keyword filter for {self.source.name}")

            return [self._url_to_event(u) for u in matched]

    def _parse_sitemapindex(self, root) -> List[Dict]:
        urls = []
        for sm in root.findall('sm:sitemap', {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}):
            loc = sm.find('sm:loc', {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'})
            if loc is not None and loc.text:
                urls.append({'loc': loc.text, 'lastmod': None})
        # fallback without namespace
        if not urls:
            for sm in root.findall('sitemap'):
                loc = sm.find('loc')
                if loc is not None and loc.text:
                    urls.append({'loc': loc.text, 'lastmod': None})
        return urls

    def _parse_urlset(self, root) -> List[Dict]:
        urls = []
        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        for url_elem in root.findall('sm:url', ns):
            loc = url_elem.find('sm:loc', ns)
            lastmod = url_elem.find('sm:lastmod', ns)
            if loc is not None and loc.text:
                urls.append({
                    'loc': loc.text,
                    'lastmod': lastmod.text if lastmod is not None else None
                })
        # fallback without namespace
        if not urls:
            for url_elem in root.findall('url'):
                loc = url_elem.find('loc')
                lastmod = url_elem.find('lastmod')
                if loc is not None and loc.text:
                    urls.append({
                        'loc': loc.text,
                        'lastmod': lastmod.text if lastmod is not None else None
                    })
        return urls

    def _parse_urlset_fallback(self, root) -> List[Dict]:
        """不依赖命名空间解析"""
        urls = []
        for url_elem in root.iter():
            if url_elem.tag == 'url':
                loc = url_elem.find('loc')
                lastmod = url_elem.find('lastmod')
                if loc is not None and loc.text:
                    urls.append({
                        'loc': loc.text,
                        'lastmod': lastmod.text if lastmod is not None else None
                    })
            elif url_elem.tag == 'sitemap':
                loc = url_elem.find('loc')
                if loc is not None and loc.text:
                    urls.append({'loc': loc.text, 'lastmod': None})
        return urls

    def _keyword_matches(self, url: str, keyword: str) -> bool:
        """URL 路径关键词匹配"""
        url_lower = url.lower()
        keyword_lower = keyword.lower()
        # 直接包含关键词
        if keyword_lower in url_lower:
            return True
        # 字符占比匹配
        keyword_chars = list(keyword_lower)
        match_count = sum(1 for c in keyword_chars if c in url_lower)
        return match_count >= len(keyword_chars) * 0.6

    def _url_to_event(self, url_data: Dict) -> Dict:
        """将 sitemap URL 条目转换为事件格式"""
        url = url_data['loc']
        lastmod = url_data.get('lastmod')
        title = url.split('/')[-1].replace('-', ' ').replace('_', ' ')[:100] or url

        try:
            if lastmod:
                pub_date = datetime.strptime(lastmod[:10], '%Y-%m-%d').strftime('%Y-%m-%d')
            else:
                pub_date = datetime.now().strftime('%Y-%m-%d')
        except:
            pub_date = datetime.now().strftime('%Y-%m-%d')

        return {
            "id": f"{self.source.name}_{hash(url)}",
            "title": title,
            "url": url,
            "source": self.source.name,
            "source_icon": self.source.name[:2],
            "publish_date": pub_date,
            "summary": f"来源: {url}",
            "event_type": "policy",
            "keyword": "",
        }
```

- [ ] **Step 2: 验证文件创建**

Run: `ls -la /Users/tiger/PycharmProjects/IndustryHot/backend/app/services/crawlers/sitemap_crawler.py`

---

## Task 3: CrawlerFactory 更新

**Files:**
- Modify: `backend/app/services/crawlers/base.py:23-35`

- [ ] **Step 1: 更新 CrawlerFactory.create()**

找到 `elif source.crawl_type == CrawlType.HTML:` 分支，在其上方添加：

```python
elif source.crawl_type == CrawlType.SITEMAP:
    from app.services.crawlers.sitemap_crawler import SitemapCrawler
    return SitemapCrawler(source)
```

完整方法变为：
```python
@staticmethod
def create(source: Source) -> CrawlerBase:
    if source.crawl_type == CrawlType.RSS:
        from app.services.crawlers.rss_crawler import RSSCrawler
        return RSSCrawler(source)
    elif source.crawl_type == CrawlType.SITEMAP:
        from app.services.crawlers.sitemap_crawler import SitemapCrawler
        return SitemapCrawler(source)
    elif source.crawl_type == CrawlType.HTML:
        from app.services.crawlers.html_crawler import HTMLCrawler
        return HTMLCrawler(source)
    else:
        raise ValueError(f"Unknown crawl_type: {source.crawl_type}")
```

- [ ] **Step 2: 验证**

Run: `cd /Users/tiger/PycharmProjects/IndustryHot/backend && python3 -c "from app.services.crawlers import CrawlerFactory; from app.models.schema import CrawlType; print('OK')"`

---

## Task 4: HTMLCrawler 构造函数兼容

**Files:**
- Modify: `backend/app/services/crawlers/html_crawler.py:12-22`

- [ ] **Step 1: 确保 HTMLCrawler 接受任意 source 对象**

当前 `HTMLCrawler.__init__` 接收 `source: Source`。`SitemapCrawler` 降级时传入的 `self.source` 是同一个 `Source` 对象，类型一致，无需修改。

验证 Run: `cd /Users/tiger/PycharmProjects/IndustryHot/backend && python3 -c "from app.services.crawlers.html_crawler import HTMLCrawler; from app.models.schema import Source; s = Source(id=1, name='test', category='a', url='http://x.com', enabled=True, crawl_type='html'); c = HTMLCrawler(s); print('HTMLCrawler OK')"`

---

## Task 5: 数据库更新

**Files:**
- 数据库：`industry_pulse.sources` 表

- [ ] **Step 1: 将工信部、发改委、证监会改为 sitemap 类型**

```sql
UPDATE sources SET crawl_type = 'sitemap'
WHERE name IN ('工信部官网', '国家发改委', '证监会披露');
```

- [ ] **Step 2: 同时禁用无 selector 的 HTML 源**

由于这些源没有 selector，降级到 HTML 也无法工作，先禁用：

```sql
UPDATE sources SET enabled = FALSE
WHERE crawl_type = 'html' AND (list_selector IS NULL OR title_selector IS NULL);
```

Run (在 backend 目录执行):
```bash
cd /Users/tiger/PycharmProjects/IndustryHot/backend && python3 -c "
from app.database import get_db_cursor
with get_db_cursor() as cursor:
    cursor.execute(\"UPDATE sources SET crawl_type = 'sitemap' WHERE name IN ('工信部官网', '国家发改委', '证监会披露')\")
    print(f'Updated {cursor.rowcount} sitemap sources')
    cursor.execute(\"UPDATE sources SET enabled = FALSE WHERE crawl_type = 'html' AND (list_selector IS NULL OR title_selector IS NULL)\")
    print(f'Disabled {cursor.rowcount} html sources without selectors')
"
```

---

## Task 6: 端到端验证

**Files:**
- 测试手动验证

- [ ] **Step 1: 测试 SitemapCrawler 能正确导入**

Run: `cd /Users/tiger/PycharmProjects/IndustryHot/backend && python3 -c "from app.services.crawlers.sitemap_crawler import SitemapCrawler; print('Import OK')"`

- [ ] **Step 2: 测试证监会 sitemap 解析**

Run:
```bash
cd /Users/tiger/PycharmProjects/IndustryHot/backend && python3 -c "
import asyncio
from app.services.crawlers import CrawlerFactory
from app.models.schema import Source, CrawlType

async def test():
    source = Source(
        id=1, name='证监会披露', category='official',
        url='https://www.csrc.gov.cn', enabled=True,
        crawl_type=CrawlType.SITEMAP
    )
    crawler = CrawlerFactory.create(source)
    events = await crawler.crawl('证监会', 'month')
    print(f'证监会披露: {len(events)} events')
    for e in events[:3]:
        print(f'  - {e[\"title\"][:60]}')

asyncio.run(test())
"
```
Expected: 输出 events 数量和前3条标题

- [ ] **Step 3: 提交变更**

```bash
git add backend/app/models/schema.py backend/app/services/crawlers/base.py backend/app/services/crawlers/sitemap_crawler.py
git commit -m "$(cat <<'EOF'
feat(crawler): add SitemapCrawler with HTML fallback

- Add SITEMAP to CrawlType enum
- Create SitemapCrawler that parses sitemap.xml
- Falls back to HTMLCrawler on failure
- Update 工信部/发改委/证监会 to sitemap type

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## 自检清单

- [ ] spec 中每项需求都有对应 task 实现
- [ ] 无 placeholder（TODO、TBD、fill in later）
- [ ] 类型一致性：枚举值、方法签名与设计一致
- [ ] 所有 `python3 -c` 命令已验证可执行

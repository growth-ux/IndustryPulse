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
        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        for sm in root.findall('sm:sitemap', ns):
            loc = sm.find('sm:loc', ns)
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
        if keyword_lower in url_lower:
            return True
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
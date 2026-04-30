# 新闻聚合爬虫设计方案

**目标：** 聚合国内外知名网站的最新新闻，实现定时抓取、自动分类、去除重复

---

## 一、现状分析

### 1.1 已实现的能力

| 爬虫类型 | 实现方式 | 适用场景 |
|----------|----------|----------|
| RSS 爬虫 | feedparser 解析 XML | 网站主动提供 RSS/Atom 订阅源 |
| Sitemap 爬虫 | xml.etree 解析 sitemap.xml | 网站有 sitemap 但无 RSS |
| HTML 爬虫 | bs4 + CSS Selector | 需手动配置 selector |

### 1.2 当前问题

- **RSS 源覆盖率低**：多数中文媒体只有首页 RSS，没有细分频道
- **政府/机构网站**：既无 RSS 也无 sitemap，或被 WAF 拦截
- **反爬机制**：虎嗅、财新、第一财经等被 Aliyun WAF 封禁
- **内容质量参差**： RSS 内容摘要短，分类不准

---

## 二、技术方案

### 2.1 分层爬取架构

```
优先级 1: RSS 源库（主力）
    ↓ 失败时降级
优先级 2: Sitemap 解析
    ↓ 失败时降级
优先级 3: HTML Selector 解析
    ↓ 失败时降级
优先级 4: 第三方 RSS 聚合服务
```

### 2.2 RSS 源库建设

**源分类：**

| 类别 | 示例源 | 优先级 |
|------|--------|--------|
| 科技媒体 | 36Kr、钛媒体、爱范儿、极客公园 | P0 |
| 主流媒体 | 人民网、新华网、中新经纬 | P0 |
| 政府政策 | 发改委、工信部、证监会官网 | P1 |
| 财经媒体 | 经济观察报、第一财经（备选） | P1 |
| 国外源 | Hacker News、TechCrunch、ArXiv | P2 |

**RSS URL 规范：**
- 标准路径：`/feed`、`/rss`、`/atom.xml`
- 媒体路径：`/36kr/feed`、`/tech/feed`
- 验证：用 `curl -I` 检查 HTTP 状态

### 2.3 缺失源的解决方案

#### 方案 A：sitemap.xml 补充（已实现）

对于无 RSS 但有 sitemap 的网站：

```python
# SitemapCrawler 工作流程
1. 尝试获取 {base_url}/sitemap.xml
2. 解析 XML（支持 sitemapindex 和 urlset）
3. URL 关键词过滤
4. 降级到 HTMLCrawler
```

#### 方案 B：Feed43 规则转换（推荐）

对于既无 RSS 又无 sitemap 的网站：

1. 在 Feed43.com 手动配置提取规则
2. 生成静态 RSS URL
3. 存入 sources 表，类型为 `rss`

**适用场景：**
- 政府网站政策公告页
- 论坛/社区最新帖
- 静态页面新闻列表

#### 方案 C：第三方聚合 API

| 服务 | 说明 | 成本 |
|------|------|------|
| Feedbin | 付费聚合服务，API 访问 | ¥30/月 |
| Feedly | 订阅制，有开发者 API | ¥60/月 |
| EmbedAPI | 开源自建 | 服务器成本 |

---

## 三、数据库设计

### 3.1 sources 表结构

```sql
CREATE TABLE sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,           -- 站点名称
    category VARCHAR(50) NOT NULL,       -- 分类：media/official/foreign/academic
    url VARCHAR(500),                     -- 原始 URL 或 RSS URL
    feed_url VARCHAR(500),               -- RSS 订阅地址（与 url 可不同）
    description VARCHAR(200),            -- 描述
    enabled BOOLEAN DEFAULT TRUE,       -- 是否启用
    crawl_type ENUM('rss','sitemap','html','api') DEFAULT 'rss',
    list_selector VARCHAR(200),          -- HTML 解析用
    title_selector VARCHAR(200),
    article_count INT DEFAULT 0,
    last_update DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 关键索引

```sql
-- 按分类查询启用的源
CREATE INDEX idx_sources_enabled ON sources(enabled, category);

-- 去重检查
CREATE UNIQUE INDEX idx_sources_feed_url ON sources(feed_url);
```

---

## 四、爬取策略

### 4.1 定时策略

| 源类型 | 爬取间隔 | 说明 |
|--------|----------|------|
| RSS | 30 分钟 | 内容更新快 |
| Sitemap | 1 小时 | 次级源 |
| HTML | 2 小时 | 资源消耗大 |

### 4.2 并发控制

```python
MAX_CONCURRENCY = 5      # 同时爬取的最大源数
MAX_EVENTS_PER_SOURCE = 20  # 每个源每次最多处理条数
```

### 4.3 关键词过滤

与现有逻辑一致：

```python
def _filter_by_keyword(entry, keyword):
    # 完整匹配
    if keyword.lower() in entry.title.lower():
        return True
    # 字符占比 60% 匹配
    keyword_chars = list(keyword.lower())
    match_count = sum(1 for c in keyword_chars if c in entry.title.lower())
    return match_count >= len(keyword_chars) * 0.6
```

---

## 五、内容质量保障

### 5.1 事件分类

沿用现有规则，基于关键词匹配：

| 类型 | 关键词 |
|------|--------|
| policy | 政策、工信部、发改委、监管、规划 |
| funding | 融资、投资、轮、估值 |
| product | 发布、推出、上线、新版本 |
| tech | 突破、技术、研发、芯片 |
| report | 财报、营收、业绩 |

### 5.2 AI 摘要增强

使用 `ai_service.generate_commentary()` 生成事件解读，补充到 `ai_commentary` 字段。

### 5.3 去重机制

```sql
-- 基于 (keyword + title + publish_date) 去重
INSERT INTO events (...)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
```

---

## 六、已验证的 RSS 源清单

### 6.1 国内科技媒体

| 站点 | RSS URL | 状态 |
|------|---------|------|
| 36Kr | https://36kr.com/feed | ✅ |
| 钛媒体 | https://www.tmtpost.com/rss | ✅ |
| 爱范儿 | https://www.ifanr.com/feed | ✅ |
| 极客公园 | https://www.geekpark.net/rss | ✅ |
| 少数派 | https://sspai.com/feed | ✅ |
| 中新经纬 | https://www.chinanews.com/rss | ✅ |
| 经济观察报 | https://www.eeo.com.cn/rss | ✅ |
| 人民网财经 | http://finance.people.com.cn/rss | ✅ |

### 6.2 政府机构

| 站点 | 类型 | 说明 |
|------|------|------|
| 发改委 | sitemap | https://so.ndrc.gov.cn/sitemap.xml |
| 工信部 | sitemap | https://www.miit.gov.cn/sitemap.xml |
| 证监会 | sitemap | https://www.csrc.gov.cn/sitemap.xml |

### 6.3 国外源

| 站点 | RSS URL | 说明 |
|------|---------|------|
| Hacker News | https://hnrss.org/frontpage | 技术社区 |
| TechCrunch | https://techcrunch.com/feed/ | 需翻墙 |
| ArXiv CS | https://arxiv.org/rss/cs | 学术论文 |

---

## 七、后续扩展

### 7.1 优先级 P0（立即可做）

- [ ] 扩充 RSS 源库到 30+ 个
- [ ] 完善政府网站 sitemap 解析
- [ ] 配置缺失的 CSS selector

### 7.2 优先级 P1（下一迭代）

- [ ] 接入 Feed43 转换规则
- [ ] 添加 Telegram/Discord 频道爬取
- [ ] 支持 YouTube RSS（频道视频列表）

### 7.3 优先级 P2（长期规划）

- [ ] 自建 Feed43 规则生成器
- [ ] 接入第三方聚合 API
- [ ] 实现 ML 分类替代关键词规则

---

## 八、实现检查清单

- [ ] RSS 源数量 ≥ 30
- [ ] 所有源可正常爬取（测试覆盖）
- [ ] 重复事件去重有效
- [ ] AI 摘要正常生成
- [ ] 调度间隔与内容更新频率匹配
- [ ] 日志记录完整（入口/出口/异常）

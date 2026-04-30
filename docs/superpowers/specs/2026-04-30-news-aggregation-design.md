# 新闻聚合爬虫设计方案

**目标：** 聚合国内外知名网站的最新新闻，实现定时抓取、自动分类、去除重复

---

## 一、设计原则

### 1.1 核心矛盾

> **你想爬的内容，往往不希望被你爬。**

这是爬虫系统的根本矛盾。因此，设计上应优先利用「网站主动提供」的方式，越往下成本越高、越脆弱。

### 1.2 六条设计原则

| # | 原则 | 说明 |
|---|------|------|
| 1 | **分层设计** | 不同能力的网站用不同策略，不强求统一方式 |
| 2 | **质量优先** | 宁可少而稳定，不要多而脆弱 |
| 3 | **自动发现** | 减少人工维护，源库应是动态系统 |
| 4 | **优雅降级** | 单点失败不传染，放弃而不报错 |
| 5 | **差异化策略** | 按内容时效性配置爬取间隔 |
| 6 | **对抗即失败** | 反爬时换源，不对抗 |

---

## 二、爬取能力分层

### 2.1 四层架构

| 层级 | 网站意愿 | 爬取方式 | 代表 |
|------|----------|----------|------|
| **L1** | 主动提供 RSS | 直接解析 XML | 36Kr、钛媒体、ArXiv |
| **L2** | 提供 sitemap | 解析 sitemap.xml | 多数中大型站 |
| **L3** | 无特殊支持 | HTML + CSS Selector | 政府网站、论坛 |
| **L4** | 故意阻挡 | 第三方服务 / 人工 | 虎嗅、财新（被 WAF 封） |

**降级路径：L1 → L2 → L3 → L4 → 放弃（不报错）**

### 2.2 降级示例

```
尝试 L1 RSS
  ↓ 失败（404/解析失败）
尝试 L2 Sitemap
  ↓ 失败（返回 HTML 或无权限）
尝试 L3 HTML（需预配置 selector）
  ↓ 失败（无 selector 或解析失败）
标记为「待人工处理」，继续其他源
```

**关键：降级失败只记录日志，不抛出异常，不阻塞其他源。**

---

## 三、源的质量评估

### 3.1 评估维度

| 维度 | 说明 | 权重 |
|------|------|------|
| 更新频率 | RSS 更新周期是否与新闻价值匹配 | 高 |
| 内容完整度 | 标题+摘要+正文 vs 只有标题 | 高 |
| 可访问性 | 是否稳定可爬（不被封） | 极高 |
| 去重便利性 | 是否有唯一 ID（entry.id） | 中 |

### 3.2 质量 vs 数量

- **一个可靠 RSS 源** 胜过 10 个不稳定源
- 源库扩展时，先验证可访问性，再评估内容质量
- 定期清理「已死」或「长期被封」的源

---

## 四、差异化爬取策略

### 4.1 按内容时效性配置间隔

| 内容类型 | 典型来源 | 爬取间隔 |
|----------|----------|----------|
| 突发新闻 | 36Kr、钛媒体 | 15-30 分钟 |
| 政策公告 | 政府官网 | 1-2 小时 |
| 深度分析 | 少数派、财新 | 4-6 小时 |
| 学术论文 | ArXiv | 12-24 小时 |

**不要用统一间隔。要按源的特点差异化配置。**

### 4.2 并发控制

```python
MAX_CONCURRENCY = 5        # 同时爬取的最大源数
MAX_EVENTS_PER_SOURCE = 20 # 每个源每次最多处理条数
```

---

## 五、源的自动化发现

### 5.1 自动发现方式

| 方式 | 原理 | 适用层级 |
|------|------|----------|
| RSS 自动发现 | 解析 HTML 中的 `<link rel="alternate" type="application/rss+xml">` | L1 |
| sitemap 自动发现 | 检查 `/sitemap.xml` 是否存在 | L2 |
| 搜索引擎发现 | `site:xxx.com filetype:xml` 批量发现 | L1/L2 |

### 5.2 源库应是动态系统

- 新增源时：先验证可访问性和内容质量，再入库
- 源失效时：自动标记，不立即删除（可恢复）
- 定期巡检：低质量源自动降级或禁用

---

## 六、反爬应对策略

### 6.1 反爬类型与应对

| 反爬类型 | 应对方式 |
|----------|----------|
| UA 检测 | 轮换 User-Agent |
| 请求频率限制 | 控制并发、随机延迟 |
| WAF 拦截 | 换 IP / 代理 / 第三方服务 |
| 验证码 | 无解，换源 |

### 6.2 核心原则

> **反爬是持久战，不要试图对抗。解决方案永远是「换个源」。**

---

## 七、技术方案

### 7.1 分层爬取架构

```
优先级 1: RSS 源库（主力）
    ↓ 失败时降级
优先级 2: Sitemap 解析
    ↓ 失败时降级
优先级 3: HTML Selector 解析
    ↓ 失败时降级
优先级 4: 第三方 RSS 聚合服务
```

### 7.2 缺失源的解决方案

| 方案 | 说明 | 适用场景 |
|------|------|----------|
| sitemap.xml | 解析 sitemap | 有 sitemap 无 RSS 的站 |
| Feed43 | 规则转换 | 既无 RSS 又无 sitemap |
| 第三方 API | 付费服务 | 被 WAF 封的重要源 |

---

## 八、数据库设计

### 8.1 sources 表结构

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

### 8.2 关键索引

```sql
-- 按分类查询启用的源
CREATE INDEX idx_sources_enabled ON sources(enabled, category);

-- 去重检查
CREATE UNIQUE INDEX idx_sources_feed_url ON sources(feed_url);
```

---

## 九、内容质量保障

### 9.1 事件分类

基于关键词匹配：

| 类型 | 关键词 |
|------|--------|
| policy | 政策、工信部、发改委、监管、规划 |
| funding | 融资、投资、轮、估值 |
| product | 发布、推出、上线、新版本 |
| tech | 突破、技术、研发、芯片 |
| report | 财报、营收、业绩 |

### 9.2 AI 摘要增强

使用 `ai_service.generate_commentary()` 生成事件解读，补充到 `ai_commentary` 字段。

### 9.3 去重机制

```sql
-- 基于 (keyword + title + publish_date) 去重
INSERT INTO events (...)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
```

---

## 十、已验证的 RSS 源清单

### 10.1 国内科技媒体

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

### 10.2 政府机构

| 站点 | 类型 | 说明 |
|------|------|------|
| 发改委 | sitemap | https://so.ndrc.gov.cn/sitemap.xml |
| 工信部 | sitemap | https://www.miit.gov.cn/sitemap.xml |
| 证监会 | sitemap | https://www.csrc.gov.cn/sitemap.xml |

### 10.3 国外源

| 站点 | RSS URL | 说明 |
|------|---------|------|
| Hacker News | https://hnrss.org/frontpage | 技术社区 |
| TechCrunch | https://techcrunch.com/feed/ | 需翻墙 |
| ArXiv CS | https://arxiv.org/rss/cs | 学术论文 |

---

## 十一、后续扩展

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 扩充 RSS 源库到 30+ 个 | 优先科技+主流媒体 |
| P0 | 完善政府网站 sitemap 解析 | 降级到 HTML 时需 selector |
| P1 | 接入 Feed43 转换规则 | 无 RSS 无 sitemap 的站 |
| P1 | 添加 Telegram/Discord 频道爬取 | 社交媒体内容 |
| P2 | 接入第三方聚合 API | 被 WAF 封的重要源 |
| P2 | 实现 ML 分类替代关键词规则 | 提升分类准确率 |

---

## 十二、实现检查清单

- [ ] 分层降级路径清晰，无阻塞
- [ ] RSS 源数量 ≥ 30
- [ ] 所有源可正常爬取（测试覆盖）
- [ ] 重复事件去重有效
- [ ] AI 摘要正常生成
- [ ] 调度间隔与内容更新频率匹配
- [ ] 日志记录完整（入口/出口/异常）

# IndustryPulse 扩展与迭代规划

---

## 一、产品演进方向

项目的潜力方向是从**"信息聚合工具"**演化为**"产业情报平台"**。以下是各阶段的产品规划。

---

### Phase 1: 体验补全（约2-3周）

#### P1.1 自由搜索 Query

**现状**: 用户只能在预设的8个产业赛道中选择，无法输入任意关键词。

**目标**: 支持自由文本搜索，同时保留预设赛道作为快捷选项。

**实现思路**:
- 扩展 `search_type`，增加 `FREE_TEXT` 类型
- 后端将自由文本作为 keyword 直接匹配 events 表
- 考虑支持分词+模糊匹配，提升召回率

---

#### P1.2 内容去重

**现状**: 同一事件被多个来源报道时，时间轴会显示多条重复条目。

**目标**: 对标题相似度高于阈值的多条事件合并为一条，保留可信度最高的来源。

**实现思路**:
- 爬取后通过标题相似度（编辑距离/Jaccard）做去重
- 可信度权重：官方源 > 媒体源 > 社交源
- 合并后标注"由N个来源报道"

---

#### P1.3 数据 Freshness 监控

**现状**: 爬虫依赖来源稳定性，来源失效用户无感知。

**目标**: 订阅源健康度可视化，自动标记失效来源。

**实现思路**:
- 记录每次爬取的成功/失败状态
- 计算来源的"有效率"（近7天成功次数/尝试次数）
- 低于阈值时在管理后台标红警告
- 支持 webhook 告警通知

---

#### P1.4 热点功能与主时间轴打通

**现状**: `/hot` 热搜页面与主时间轴功能完全割裂。

**目标**: 热搜事件可一键转化为时间轴查询。

**实现思路**:
- 热搜词点击后自动填入搜索框，触发时间轴生成
- 区分"实时热搜"和"领域热点"，后者来自系统内高热度事件

---

### Phase 2: 关系与洞察（约3-4周）

#### P2.1 事件关联图谱

**现状**: 事件之间无关联，用户看到的是孤立事件点。

**目标**: 建立事件间的关联关系，支持"前因-后果-相关方"追溯。

**数据模型扩展**:
```sql
-- 新增 event_relations 表
CREATE TABLE event_relations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source_event_id BIGINT NOT NULL,
  target_event_id BIGINT NOT NULL,
  relation_type ENUM('causes', 'follows', 'related_to', 'mentions') NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_event_id) REFERENCES events(id),
  FOREIGN KEY (target_event_id) REFERENCES events(id)
);
```

**关联生成策略**:
- 基于关键词共现（同标题/摘要中高频出现的实体词）
- 基于时间接近（7天内同产业的事件）
- 基于提及关系（A事件中明确提到B事件）

**产品呈现**:
- 事件详情页展示关联事件卡片
- 可切换"时间线视图"和"关系图谱视图"

---

#### P2.2 时间轴叙事增强

**现状**: 时间轴只是按时间排序的事件列表。

**目标**: 引入叙事辅助，帮助用户快速理解产业阶段和里程碑。

**产品特性**:
- **阶段划分**: 自动识别产业发展阶段（如"低谷期"、"扩张期"、"整合期"），标注在时间轴侧边
- **里程碑高亮**: 重要性高的事件（如政策发布、龙头财报）自动放大显示
- **因果连线**: 有关联的事件之间显示连线，hover 显示关系说明

**实现思路**:
- 通过重要性得分（来源权重 × 事件类型权重）识别里程碑事件
- 阶段划分可基于事件密度聚类或规则（政策发布后通常有产业资本响应）

---

#### P2.3 可信度评估体系

**现状**: 所有来源一视同仁，无权重区分。

**目标**: 对来源和事件进行可信度评分，过滤低质量内容。

**来源权重表（示例）**:
| 类型 | 权重 |
|------|------|
| official | 1.0 |
| data | 0.9 |
| media | 0.7 |
| academic | 0.6 |
| social | 0.4 |

**事件可信度**: `event_score = source_weight * content_quality_factor`

- 低于阈值的事件默认折叠或标记"待验证"
- 用户可主动开启/关闭低可信度过滤

---

### Phase 3: 用户与协作（约2-3周）

#### P3.1 用户体系增强

**现状**: 极简用户表，单一用户 weiyu，无登录机制。

**目标**: 支持多用户注册/登录，支持个人数据隔离。

**实现方案**:
- 引入 JWT 认证（简单方案可用 Flask-JWT-Extended 或 python-jose）
- favorites 表 user_id 与 users 表关联
- 敏感操作（删除来源、管理订阅）需要管理员权限

**优先级**: 可选，若产品定位为个人工具则优先级低

---

#### P3.2 团队协作

**现状**: 无法多人共享关注领域和数据。

**目标**: 支持团队空间，成员共享订阅源和收藏。

**数据模型扩展**:
```sql
CREATE TABLE teams (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_members (
  team_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role ENUM('admin', 'member') DEFAULT 'member',
  PRIMARY KEY (team_id, user_id)
);

-- industries/sources 表增加 team_id 字段（NULL 表示个人）
ALTER TABLE industries ADD COLUMN team_id BIGINT DEFAULT NULL;
ALTER TABLE sources ADD COLUMN team_id BIGINT DEFAULT NULL;
```

---

#### P3.3 收藏标注增强

**现状**: favorites 只有简单的 annotation 文本。

**目标**: 支持标签、分类、多维度标注。

**扩展字段**:
```sql
ALTER TABLE favorites ADD COLUMN tags JSON DEFAULT NULL;  -- ["重要", "待核实", "用于Q3报告"]
ALTER TABLE favorites ADD COLUMN mood ENUM('positive', 'negative', 'neutral') DEFAULT NULL;  -- 情感标签
```

---

### Phase 4: 分发与提醒（约2周）

#### P4.1 邮件/推送订阅

**现状**: 用户需要主动打开应用获取信息。

**目标**: 支持基于关键词的邮件/Webhook提醒。

**产品场景**:
- "每天早9点推送AI领域最新5条事件"
- "当半导体行业出现重磅政策时立即通知"
- "每周一生成上周产业周报"

**实现方案**:
- 用户配置提醒规则（关键词 + 触发条件 + 推送方式）
- 定时任务扫描最新事件，匹配规则后推送
- 使用 APScheduler 或外部队列（如 Celery + Redis）

---

#### P4.2 报告导出优化

**现状**: 仅支持 JSON 和 Markdown 原始导出。

**目标**: 支持结构化报告模板（周报/月报/事件专题报告）。

**模板类型**:
- 产业周报：周内事件摘要 + 热度排行 + 里程碑事件
- 事件专题：特定事件的多维度分析（时间线 + 关联事件 + 来源分布）
- 竞品追踪：针对特定公司的新闻聚合

---

### Phase 5: 平台化（长期）

#### P5.1 开放 API

对 B 端用户提供 API 接口，支持：
- 查询指定关键词的时间轴
- 批量导出事件数据
- 推送事件到用户自建系统

**API 设计**: RESTful + API Key 认证

#### P5.2 内容合作与付费订阅

- 接入更多高质量数据源（付费API）
- 推出基础版（免费）/ 专业版（付费）分层
- 专业版解锁：向量搜索、无限导出、团队协作、报告生成

---

## 二、架构演进规划

---

### Phase 1: 稳定性与可维护性（约1-2周）

#### A1.1 测试覆盖

**现状**: 零测试，代码修改无快速验证手段。

**目标**: 核心业务逻辑单元测试覆盖。

**测试范围**（按优先级）:
1. `processor.py` 的查询逻辑（最高优先）
2. `crawler.py` 的爬取 + 过滤逻辑
3. AI service 的降级逻辑
4. API 路由的请求/响应格式

**工具**: pytest（后端）+ Vitest / React Testing Library（前端）

---

#### A1.2 统一异常处理

**现状**: 错误响应格式不统一，每个路由自行处理。

**目标**: 全局异常中间件，统一错误格式。

```python
# 目标格式
{
  "success": False,
  "error": {
    "code": "SOURCE_NOT_FOUND",
    "message": "订阅源不存在或已被删除",
    "details": {...}
  }
}
```

---

#### A1.3 Health Check 端点

**现状**: 无健康检查，负载均衡无法感知服务状态。

**目标**: `/health` 返回服务 + 数据库 + 爬虫健康状态。

```python
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "database": check_db(),
        "crawler": check_crawler_sources(),
        "last_crawl": get_last_crawl_time()
    }
```

---

### Phase 2: 异步与性能（约2-3周）

#### A2.1 异步数据库驱动

**现状**: `mysql-connector-python` 同步驱动，在 async FastAPI 中通过 `run_in_executor` 调用。

**目标**: 替换为 `aiomysql` 或 `asyncmy`，真正实现全链路异步。

**改动范围**:
- `database.py` 替换连接方式
- 所有 DB 调用改为 `await`
- 连接池从 `mysql.connector.pooling.MySQLConnectionPool` 换为 `aiomysql.Pool`

**收益**: 高并发下吞吐量提升显著，事件循环不再被阻塞。

---

#### A2.2 APScheduler 与 FastAPI 正确集成

**现状**: `BackgroundScheduler` 在后台线程运行同步代码，无法与 uvicorn 协同。

**目标**: 使用 `AsyncIOScheduler` 或将调度任务剥离为独立 Worker 进程。

**方案A（推荐）**: `from apscheduler.schedulers.asyncio import AsyncIOScheduler`

```python
scheduler = AsyncIOScheduler()
scheduler.add_job(crawl_task, 'interval', minutes=30)
scheduler.start()
```

**方案B**: 将爬虫任务拆为独立 Python CLI，通过 systemd/cron 驱动，与 FastAPI 完全解耦。

---

#### A2.3 引入 Redis 缓存层

**现状**: 无缓存，每次查询直接打数据库。

**目标**: 热点数据（recent events、industries、sources）缓存到 Redis。

**缓存策略**:
| 数据 | TTL | 失效触发 |
|------|-----|---------|
| industries 列表 | 1小时 | 增删时删除 |
| sources 列表 | 1小时 | 增删时删除 |
| 热门事件（last 24h） | 5分钟 | 定时任务刷新 |
| 用户 timeline 查询结果 | 10分钟 | 分页请求不缓存 |

---

#### A2.4 前端状态管理

**现状**: 仅靠 Context + prop drilling，大型页面会成瓶颈。

**目标**: 引入 `zustand`（轻量）或 `tanstack/react-query`（数据获取专精）。

**推荐**: React Query 处理 server state，Zustand 处理 UI state。

---

### Phase 3: 搜索能力（约2-3周）

#### A3.1 全文搜索增强

**现状**: 依赖 MySQL LIKE 查询，精度和召回率有限。

**目标**: 引入 Elasticsearch，满足分词 + 权重 + 高亮需求。

**迁移策略**:
- 保持 MySQL 作为 source of truth
- Elasticsearch 仅作搜索索引，写入时同步
- 搜索请求路由到 ES，返回结果从 MySQL 补全

---

#### A3.2 向量语义搜索

**现状**: 仅支持关键词匹配，不理解语义。

**目标**: 引入向量数据库（如 Qdrant / Milvus），支持"寻找与某事件类似的产业事件"的语义搜索。

**实现路径**:
- 事件写入时，调用 Embedding API 生成向量
- 存入 Qdrant（轻量，支持本地部署）
- 查询时计算余弦相似度，返回高相关事件

**注意**: Phase 1 需求，可跳过的初期扩展。

---

### Phase 4: 安全与合规（约1-2周）

#### A4.1 API 认证与鉴权

**现状**: 所有 API 无权限控制。

**目标**: JWT 认证 + RBAC 权限模型。

**权限分级**:
| 角色 | 读取 | 收藏 | 管理来源 | 管理用户 |
|------|------|------|---------|---------|
| 访客 | ✓ | ✗ | ✗ | ✗ |
| 普通用户 | ✓ | ✓ | ✗ | ✗ |
| 管理员 | ✓ | ✓ | ✓ | ✓ |

---

#### A4.2 CORS 与安全头

**现状**: CORS 配置为 `"*"`。

**目标**: 生产环境限定具体域名，添加 security headers。

```python
# 目标配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://industrypulse.com"],  # 非 *
    allow_credentials=True,
    middleware_path=...
)
```

---

### Phase 5: 运维基建（约1-2周）

#### A5.1 日志轮转

**现状**: 日志写入文件，无轮转，长期运行撑爆磁盘。

**目标**: 配置 `RotatingFileHandler` 或接入 logging aggregator（如 Loki / ELK）。

```python
from logging.handlers import RotatingFileHandler
handler = RotatingFileHandler('logs/app.log', maxBytes=10_000_000, backupCount=5)
```

---

#### A5.2 容器化完善

**现状**: `deploy/` 目录存在，内容未验证。

**目标**: 提供完整的 `docker-compose.yml` 和 `Dockerfile`。

**服务拆分**（可选，Phase 3+）:
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│  nginx   │ │ fastapi  │ │ celery    │
│ (反向代理) │ │ (API)    │ │ (爬虫worker)│
└──────────┘ └──────────┘ └──────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐   ┌────────┐   ┌────────┐
         │ MySQL  │   │ Redis  │   │  Qdrant │
         └────────┘   └────────┘   └────────┘
```

---

#### A5.3 监控告警

**目标**: 关键指标接入监控（Prometheus + Grafana）。

**监控指标**:
- API 响应时间 P99
- 爬虫成功率
- AI 服务调用失败率
- 数据库连接池使用率
- 事件表数据增长速率

---

## 三、迭代优先级矩阵

| 优先级 | 产品 | 架构 | 预计工时 |
|--------|------|------|---------|
| P0 | 自由搜索 Query | - | 0.5天 |
| P0 | - | 异步数据库驱动 | 2-3天 |
| P0 | - | 测试覆盖（核心逻辑） | 2-3天 |
| P1 | 内容去重 | - | 1-2天 |
| P1 | 数据 Freshness 监控 | - | 1-2天 |
| P1 | - | APScheduler 正确集成 | 1天 |
| P1 | - | 统一异常处理 | 0.5天 |
| P1 | - | Health Check | 0.5天 |
| P1 | - | Redis 缓存层 | 2-3天 |
| P1 | 事件关联图谱 | - | 3-4天 |
| P2 | 时间轴叙事增强 | - | 2-3天 |
| P2 | 可信度评估体系 | - | 1-2天 |
| P2 | 用户体系增强 | - | 2-3天 |
| P2 | - | API 认证与鉴权 | 2-3天 |
| P2 | - | 前端状态管理 | 1-2天 |
| P3 | 热点与主轴打通 | - | 1天 |
| P3 | 团队协作 | - | 3-4天 |
| P3 | 邮件/推送订阅 | - | 2-3天 |
| P3 | - | 全文搜索（ES） | 3-4天 |
| P3 | - | 日志轮转 | 0.5天 |
| P3 | - | 容器化完善 | 1-2天 |
| P4 | 报告导出优化 | - | 2-3天 |
| P4 | - | 向量语义搜索 | 3-4天 |
| P4 | 开放 API | - | 2-3天 |
| P4 | - | 监控告警 | 1-2天 |

---

## 四、总结

项目已具备完整的核心链路（爬→存→AI→查→展示），但在**搜索体验、内容质量、数据关联、架构稳健性**上有明显的迭代空间。

近期优先推进 **P0/P1** 项（自由搜索、异步驱动、测试覆盖、缓存层），中期发展 **P2** 项（事件关联、用户体系、可信度），长期向 **P3/P4** 项（语义搜索、平台化）演进。

核心原则：**产品功能驱动架构升级，架构升级支撑产品演进**，避免过早优化，也避免架构债积累到阻碍产品迭代。

---

*文档生成时间：2026/05/05*
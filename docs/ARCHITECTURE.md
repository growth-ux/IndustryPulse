# 技术架构文档 (MVP版)

## IndustryPulse — 产业热点时间轴分析工具

> **7天Demo版 · 最小技术栈**

---

## 1. 技术栈选择（最小可行）

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 前端 | 原型HTML + 原生JS | 直接可用，无需构建 |
| 后端 | Node.js + Express | 单文件服务，JSON处理强 |
| 数据库 | MongoDB | 够用，Schema灵活 |
| AI | OpenAI API (直接调用) | 不拆分微服务 |
| 缓存 | Node.js 内存缓存 | demo数据量用不着Redis |
| 搜索 | MongoDB text index | 够用，不用ES |

**排除项（后期再加）：**
- ~~Elasticsearch~~ — MongoDB全文搜索够用
- ~~Redis~~ — demo数据量用内存缓存即可
- ~~向量数据库~~ — 当前无语义搜索需求
- ~~AI微服务~~ — 直接调API，简化架构
- ~~K8s~~ — Docker Compose单节点部署

---

## 2. 系统架构

```
┌─────────────────────────────────────┐
│           用户浏览器                 │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│         Nginx (可选，反向代理)        │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│    Node.js 后端 (Express)            │
│    ┌─────────────────────────────┐  │
│    │  /api/timeline             │  │
│    │  /api/search                │  │
│    │  /api/export                │  │
│    └─────────────────────────────┘  │
│    ┌─────────────────────────────┐  │
│    │  CrawlerService (RSS解析)  │  │
│    │  AIService (OpenAI调用)    │  │
│    │  EventService (业务逻辑)   │  │
│    └─────────────────────────────┘  │
└─────────────────────────────────────┘
         │              │
         ▼              ▼
┌─────────────┐  ┌─────────────┐
│   MongoDB   │  │  OpenAI API │
│   (单实例)  │  │  (GPT-4)   │
└─────────────┘  └─────────────┘
```

---

## 3. 项目结构

```
industry-pulse/
├── backend/
│   ├── src/
│   │   ├── server.js          # 入口文件
│   │   ├── routes/
│   │   │   └── api.js         # API路由
│   │   ├── services/
│   │   │   ├── crawler.js     # RSS爬虫
│   │   │   ├── ai.js          # OpenAI调用
│   │   │   ├── event.js       # 事件处理
│   │   │   └── cache.js       # 内存缓存
│   │   ├── models/
│   │   │   └── event.js       # 数据模型
│   │   └── utils/
│   │       ├── parser.js      # RSS解析
│   │       └── date.js        # 日期工具
│   ├── data/                   # 演示数据(JSON)
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   └── 02.html                 # 原型页面
│
├── docs/
│   ├── PRD.md
│   └── ARCHITECTURE.md
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

---

## 4. 数据模型

```javascript
// Event (MongoDB Collection)
{
  _id: ObjectId,
  keyword: String,           // 搜索关键词
  title: String,             // 事件标题
  url: String,              // 原文链接
  source: String,           // 来源媒体
  publishDate: Date,         // 发布时间
  summary: String,           // AI摘要(100字)
  aiCommentary: String,      // AI点评(50字)
  eventType: String,         // policy/funding/product/ma/tech/report/person/other
  createdAt: Date,
  cachedAt: Date             // 缓存时间
}

// 索引
db.events.createIndex({ keyword: 1, publishDate: -1 });
db.events.createIndex({ publishDate: -1 });
db.events.createIndex({ eventType: 1 });
db.events.createIndex({ title: "text", summary: "text" });
```

---

## 5. API 设计

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/timeline | 生成时间轴 |
| GET | /api/events | 获取事件列表 |
| GET | /api/search | 搜索事件 |
| POST | /api/export/json | 导出JSON |
| POST | /api/export/markdown | 导出MD |
| GET | /api/stats | 统计信息 |
| GET | /health | 健康检查 |

### 5.1 POST /api/timeline

**Request:**
```json
{
  "keyword": "人工智能",
  "timeRange": "month"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "keyword": "人工智能",
    "total": 24,
    "events": [
      {
        "id": "...",
        "date": "2024-03-15",
        "title": "OpenAI发布GPT-5",
        "summary": "...",
        "aiCommentary": "...",
        "source": "机器之心",
        "eventType": "product",
        "url": "https://..."
      }
    ],
    "processingTime": 2500
  }
}
```

---

## 6. 核心服务

### 6.1 爬虫服务 (crawler.js)

```javascript
class CrawlerService {
  sources = [
    { name: '36kr', url: 'https://36kr.com/feed' },
    { name: 'huxiu', url: 'https://www.huxiu.com/rss/' },
    { name: 'leiphone', url: 'https://www.leiphone.com/feed/' }
  ];

  async crawl(keyword, timeRange) {
    const events = [];
    for (const source of this.sources) {
      const feed = await this.parseRSS(source.url);
      const filtered = feed.filter(e =>
        this.matchKeyword(e.title, keyword) &&
        this.inTimeRange(e.date, timeRange)
      );
      events.push(...filtered);
    }
    return this.deduplicate(events);
  }
}
```

### 6.2 AI服务 (ai.js)

```javascript
class AIService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async summarize(content) {
    // 调用GPT-4生成100字摘要
  }

  async generateCommentary(event) {
    // 调用GPT-4生成50字点评
  }

  async classifyEvent(title, summary) {
    // 调用GPT-4判断事件类型
  }

  async processEvent(event) {
    // 批量处理: 摘要 + 点评 + 分类
  }
}
```

### 6.3 内存缓存 (cache.js)

```javascript
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 3600) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000
    });
  }
}
```

---

## 7. 数据流转

```
用户请求
    │
    ▼
┌──────────────────┐
│  缓存检查        │
│  (内存Map)       │
└──────────────────┘
    │ 命中
    ▼
┌──────────────────┐     未命中
│  直接返回缓存      │◀────────────┐
└──────────────────┘            │
    │                            │
    │ 未命中                      │
    ▼                            │
┌──────────────────┐            │
│  RSS爬取         │            │
│  (36kr/虎嗅)     │            │
└──────────────────┘            │
    │                            │
    ▼                            │
┌──────────────────┐            │
│  关键词过滤       │            │
│  + 去重          │            │
└──────────────────┘            │
    │                            │
    ▼                            │
┌──────────────────┐            │
│  AI处理          │            │
│  (摘要/点评/分类) │            │
└──────────────────┘            │
    │                            │
    ▼                            │
┌──────────────────┐            │
│  MongoDB存储      │────────────┘
└──────────────────┘
    │
    ▼
┌──────────────────┐
│  写入缓存         │
│  (TTL: 1小时)    │
└──────────────────┘
    │
    ▼
返回给用户
```

---

## 8. 7天开发计划

| Day | 任务 | 产出 |
|-----|------|------|
| Day 1 | 项目搭建 + RSS爬虫 | 能爬取新闻数据 |
| Day 2 | API开发 + MongoDB | 基础CRUD完成 |
| Day 3 | AI接入(摘要+点评) | GPT调用正常 |
| Day 4 | 前端对接 + 原型改造 | 页面能跑通 |
| Day 5 | 筛选/搜索/导出 | 完整功能 |
| Day 6 | 缓存优化 + 演示数据 | 性能优化 |
| Day 7 | 部署 + 文档 + 演示 | 可运行Demo |

---

## 9. 部署

### 9.1 Docker Compose (单文件)

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/industrypulse
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - mongo
    volumes:
      - ./data:/app/data

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### 9.2 启动命令

```bash
# 1. 克隆项目
git clone <repo>
cd industry-pulse

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY

# 3. 一键启动
docker-compose up -d

# 4. 访问
open http://localhost:3000
```

---

## 10. 扩展路线（后期）

| 阶段 | 增加内容 |
|------|----------|
| v2 | React前端 + 状态管理 |
| v2 | Redis缓存层 |
| v3 | 多数据源扩展 |
| v3 | 用户认证 |
| v4 | 定时爬虫任务 |
| v4 | Elasticsearch搜索 |
| v5 | 向量数据库(语义搜索) |
| v5 | 趋势图表 |

---

**文档版本**: v1.1 (MVP版)
**创建日期**: 2024-03

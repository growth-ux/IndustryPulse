# IndustryPulse 产业热点时间轴 — 设计文档

**版本**: v1.0
**日期**: 2024-03
**状态**: 已批准

---

## 1. 项目概述

### 1.1 目标
根据 `docs/front/02.html` 原型，开发一个产业热点事件时间轴分析工具：
- 输入关键词，自动生成该领域热点事件时间轴
- 配以AI生成的影响分析
- 支持按类型筛选、数据导出

### 1.2 技术栈
| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| 后端 | Python FastAPI |
| 数据爬取 | feedparser (RSS) |
| AI服务 | OpenAI GPT-4 / Claude API |
| 数据存储 | MySQL 8.0 | 已有环境，高并发支持 |

### 1.3 项目结构
```
industry-pulse/
├── frontend/                 # React前端
│   ├── src/
│   │   ├── components/       # UI组件
│   │   │   ├── Header/
│   │   │   ├── SearchPanel/
│   │   │   ├── Sidebar/
│   │   │   ├── Timeline/
│   │   │   ├── EventCard/
│   │   │   └── ExportPanel/
│   │   ├── hooks/            # 自定义Hooks
│   │   ├── services/         # API调用
│   │   ├── types/            # TypeScript类型
│   │   └── styles/           # 全局样式
│   └── package.json
│
├── backend/                  # FastAPI后端
│   ├── app/
│   │   ├── main.py           # FastAPI入口
│   │   ├── api/
│   │   │   └── timeline.py   # 时间轴API路由
│   │   ├── services/
│   │   │   ├── crawler.py    # RSS爬虫服务
│   │   │   ├── ai.py         # AI服务
│   │   │   └── processor.py  # 数据处理
│   │   ├── models/
│   │   │   └── schema.py     # Pydantic模型
│   │   └── core/
│   │       └── config.py     # 配置
│   ├── requirements.txt
│   └── run.py
│
└── docs/
    ├── PRD.md
    └── front/
        └── 02.html           # 原型
```

---

## 2. API设计

### 2.1 核心接口

#### POST /api/timeline/generate
生成时间轴数据

**Request:**
```json
{
  "keyword": "人工智能",
  "time_range": "month"  // week | month | quarter | halfyear | year
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "keyword": "人工智能",
    "time_range": "month",
    "total_count": 24,
    "events": [
      {
        "id": "uuid",
        "date": "2024-03-15",
        "title": "OpenAI发布GPT-5",
        "summary": "...",
        "source": "机器之心",
        "source_icon": "机",
        "type": "product",
        "type_name": "产品发布",
        "ai_commentary": "GPT-5的发布将加速...",
        "url": "https://..."
      }
    ]
  }
}
```

#### GET /api/timeline/types
获取事件类型统计

**Response:**
```json
{
  "types": [
    {"type": "policy", "name": "政策", "count": 5},
    {"type": "funding", "name": "融资", "count": 8},
    {"type": "product", "name": "产品发布", "count": 6}
  ],
  "total": 24
}
```

#### GET /api/export/{format}
导出数据，`format` 为 `json` 或 `markdown`

---

## 3. 前端组件设计

### 3.1 组件结构
```
App
├── Header           # Logo + 标语
├── SearchPanel      # 关键词输入 + 时间范围 + 生成按钮
│   ├── KeywordInput
│   ├── QuickTags
│   └── TimeRangeSelector
├── MainLayout
│   ├── Sidebar
│   │   ├── FilterPanel    # 类型筛选
│   │   ├── StatsPanel     # 统计概览
│   │   └── ExportPanel    # 导出按钮
│   └── Timeline
│       ├── TimelineHeader
│       └── TimelineList
│           └── EventCard
```

### 3.2 状态管理
使用 React Context + useReducer 管理全局状态：
- `TimelineContext`: 时间轴数据、加载状态
- `FilterContext`: 筛选条件

---

## 4. 后端服务设计

### 4.1 数据爬取流程
```
1. 接收关键词和时间范围
2. 计算日期范围
3. 并发请求多个RSS源
4. 关键词过滤 + 去重
5. 存储到SQLite
6. 触发AI处理队列
7. 返回数据
```

### 4.2 RSS数据源 (MVP阶段)
| 源 | URL | 类型 |
|----|-----|------|
| 36kr | https://36kr.com/feed | 科技、创业 |
| 虎嗅 | https://www.huxiu.com/rss/ | 商业、科技 |
| 机器之心 | RSS | AI、科技 |

### 4.3 AI处理
- 摘要提取: 截取原文前100字核心句
- AI点评: 生成50字影响分析
- 类型分类: 判断事件类型（政策/融资/产品/并购/技术/财报/人物）

---

## 5. 数据模型 (MySQL)

### 5.1 events 表
```sql
CREATE TABLE events (
    id VARCHAR(36) PRIMARY KEY,
    keyword VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    url VARCHAR(1000),
    source VARCHAR(50),
    publish_date DATE,
    summary TEXT,
    ai_commentary VARCHAR(200),
    event_type ENUM('policy', 'funding', 'product', 'ma', 'tech', 'report', 'person', 'other'),
    relevance_score FLOAT DEFAULT 0.5,
    crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_keyword (keyword),
    INDEX idx_publish_date (publish_date),
    INDEX idx_event_type (event_type)
);
```

### 5.2 event_types 表 (字典表)
```sql
CREATE TABLE event_types (
    type VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(10)
);
```

---

## 6. 错误处理

| 场景 | HTTP状态 | 响应 |
|------|---------|------|
| 成功 | 200 | `{success: true, data: {...}}` |
| 关键词为空 | 400 | `{success: false, error: "关键词不能为空"}` |
| 无搜索结果 | 404 | `{success: false, error: "未找到相关事件"}` |
| AI服务超时 | 206 | `{success: true, data: {...}, warning: "AI分析超时"}` |
| 服务器错误 | 500 | `{success: false, error: "服务器内部错误"}` |

---

## 7. 实现阶段

### Phase 1: 基础框架 (1-2天)
- [ ] 项目脚手架搭建
- [ ] FastAPI后端框架 + 路由
- [ ] React前端框架 + 路由
- [ ] 前后端API联调

### Phase 2: 数据层 (2-3天)
- [ ] RSS爬虫实现
- [ ] SQLite数据存储
- [ ] 关键词过滤逻辑

### Phase 3: AI层 (1-2天)
- [ ] OpenAI/Claude API集成
- [ ] 摘要提取
- [ ] AI点评生成
- [ ] 自动分类

### Phase 4: 功能完善 (1-2天)
- [ ] 类型筛选
- [ ] 数据导出
- [ ] 响应式布局
- [ ] 加载状态/错误处理

---

## 8. 设计决策

1. **前后端分离**: 便于独立开发、测试、部署
2. **SQLite MVP**: 避免运维复杂度，数据量可控
3. **RSS优先**: 稳定、可控，降低爬虫维护成本
4. **OpenAI备选Claude**: 根据成本和效果选择

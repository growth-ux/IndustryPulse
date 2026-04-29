# 数据洞察页面设计规格

**日期**: 2026-04-29
**状态**: 已批准
**基于原型**: `docs/front/05.html`

---

## 1. 概述

实现数据洞察页面（`/insights`），展示产业赛道的多维度分析数据：统计卡片、趋势图、分布图、赛道对比、最新动态。前端基于 React + TypeScript，后端基于 FastAPI + MySQL。

---

## 2. 后端变更

### 2.1 Schema 扩展 (`backend/app/models/schema.py`)

新增以下模型：

```python
class InsightPeriod(str, Enum):
    SEVEN_DAYS = "7d"
    THIRTY_DAYS = "30d"
    NINETY_DAYS = "90d"
    ONE_YEAR = "1y"

class InsightStatsResponse(BaseModel):
    success: bool
    data: Optional["InsightStats"] = None

class InsightStats(BaseModel):
    content_count: int
    content_count_change: float
    source_count: int
    source_count_change: float
    sentiment_index: float
    sentiment_change: float
    heat_index: float
    heat_rank: int

class TrendResponse(BaseModel):
    success: bool
    data: Optional["TrendData"] = None

class TrendData(BaseModel):
    period: str
    trends: List["DailyTrend"]

class DailyTrend(BaseModel):
    date: str
    positive: int
    negative: int

class DistributionResponse(BaseModel):
    success: bool
    data: Optional["DistributionData"] = None

class DistributionData(BaseModel):
    positive_rate: float
    categories: List["CategoryDistribution"]

class CategoryDistribution(BaseModel):
    name: str
    color: str
    percentage: float
    count: int

class ComparisonResponse(BaseModel):
    success: bool
    data: Optional["ComparisonData"] = None

class ComparisonData(BaseModel):
    tracks: List["TrackComparison"]

class TrackComparison(BaseModel):
    id: str
    name: str
    color: str
    content_count: int
    heat_index: float
    trend: float

class ActivitiesResponse(BaseModel):
    success: bool
    data: Optional["ActivitiesData"] = None

class ActivitiesData(BaseModel):
    activities: List["ActivityItem"]

class ActivityItem(BaseModel):
    id: str
    type: str
    type_name: str
    title: str
    source: str
    time_ago: str
```

### 2.2 新增 API 路由 (`backend/app/api/insights.py`)

| 端点 | 方法 | 查询参数 | 说明 |
|------|------|----------|------|
| `/api/insights/stats` | GET | `track`, `period` | 统计卡片数据 |
| `/api/insights/trends` | GET | `track`, `period` | 内容趋势数据 |
| `/api/insights/distribution` | GET | `track`, `period` | 内容分布数据 |
| `/api/insights/comparison` | GET | - | 赛道对比数据 |
| `/api/insights/activities` | GET | `track`, `limit` | 最新动态 |

### 2.3 注册路由 (`backend/app/main.py`)

```python
from app.api.insights import router as insights_router
app.include_router(insights_router, prefix="/api", tags=["insights"])
```

---

## 3. 前端变更

### 3.1 页面组件 (`frontend/src/pages/Insights.tsx`)

```
InsightsPage
├── Header (复用现有)
├── TimeTabs (时间周期: 7d/30d/90d/1y)
├── TrackSelector (赛道选择器 chips)
├── StatsGrid (4个统计卡片)
│   ├── ContentCountCard
│   ├── SourceCountCard
│   ├── SentimentCard
│   └── HeatCard
├── ChartsGrid
│   ├── TrendChart (堆叠柱状图，正面/负面)
│   └── DistributionChart (环形图)
├── TwoColumnGrid
│   ├── ComparisonTable
│   └── ActivityFeed
```

### 3.2 API 服务 (`frontend/src/services/insights.ts`)

```typescript
export async function getInsightStats(track: string, period: string): Promise<InsightStatsResponse>
export async function getInsightTrends(track: string, period: string): Promise<TrendResponse>
export async function getInsightDistribution(track: string, period: string): Promise<DistributionResponse>
export async function getInsightComparison(): Promise<ComparisonResponse>
export async function getInsightActivities(track: string, limit: number): Promise<ActivitiesResponse>
```

### 3.3 路由配置 (`frontend/src/App.tsx`)

新增路由：
```tsx
<Route path="/insights" element={<InsightsPage />} />
```

导航链接（Header）：数据洞察 → `/insights`

### 3.4 样式

复用现有 `App.css` / `index.css` 变量，参考 `05.html` 中的 CSS 变量和组件样式。

---

## 4. 数据流

```
用户选择赛道/时间周期
        │
        ▼
前端并发请求 5 个 API
├── GET /api/insights/stats?track=&period=
├── GET /api/insights/trends?track=&period=
├── GET /api/insights/distribution?track=&period=
├── GET /api/insights/comparison
└── GET /api/insights/activities?track=
        │
        ▼
更新各组件状态 → 渲染
```

---

## 5. 错误处理

- API 请求失败：显示骨架屏 + 重试按钮
- 数据为空：显示空状态提示
- 网络错误：toast 提示

---

## 6. 实现顺序

1. 后端 Schema + API 路由
2. 前端 API 服务层
3. 前端页面组件 + 样式
4. 路由配置
5. 联调测试

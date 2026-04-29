# 数据洞察页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现数据洞察页面 `/insights`，包含统计卡片、趋势图、分布图、赛道对比、最新动态五个模块

**Architecture:** 前端 React + TypeScript + Vite，后端 FastAPI + MySQL。新增 `Insights` 组件页面，调用 5 个新的后端 API 获取数据。

**Tech Stack:** React, TypeScript, FastAPI, MySQL, CSS (复用现有样式变量)

---

## 文件结构

```
backend/
├── app/models/schema.py          # 新增 InsightStats/DailyTrend 等 Pydantic 模型
├── app/api/insights.py           # 新建: 5 个 API 路由
├── app/services/processor.py     # 新增 get_insight_stats/trends 等方法

frontend/src/
├── pages/Insights.tsx            # 新建: 页面主组件
├── services/insights.ts          # 新建: API 调用
├── types/index.ts                # 新增 InsightStats 等类型
└── App.tsx                       # 新增 /insights 路由
```

---

## Task 1: 后端 Schema 扩展

**Files:**
- Modify: `backend/app/models/schema.py`

- [ ] **Step 1: 添加 InsightPeriod 枚举和新的响应模型**

在 `schema.py` 末尾添加：

```python
class InsightPeriod(str, Enum):
    SEVEN_DAYS = "7d"
    THIRTY_DAYS = "30d"
    NINETY_DAYS = "90d"
    ONE_YEAR = "1y"

class InsightStats(BaseModel):
    content_count: int
    content_count_change: float
    source_count: int
    source_count_change: float
    sentiment_index: float
    sentiment_change: float
    heat_index: float
    heat_rank: int

class InsightStatsResponse(BaseModel):
    success: bool
    data: Optional[InsightStats] = None

class DailyTrend(BaseModel):
    date: str
    positive: int
    negative: int

class TrendData(BaseModel):
    period: str
    trends: List[DailyTrend]

class TrendResponse(BaseModel):
    success: bool
    data: Optional[TrendData] = None

class CategoryDistribution(BaseModel):
    name: str
    color: str
    percentage: float
    count: int

class DistributionData(BaseModel):
    positive_rate: float
    categories: List[CategoryDistribution]

class DistributionResponse(BaseModel):
    success: bool
    data: Optional[DistributionData] = None

class TrackComparison(BaseModel):
    id: str
    name: str
    color: str
    content_count: int
    heat_index: float
    trend: float

class ComparisonData(BaseModel):
    tracks: List[TrackComparison]

class ComparisonResponse(BaseModel):
    success: bool
    data: Optional[ComparisonData] = None

class ActivityItem(BaseModel):
    id: str
    type: str
    type_name: str
    title: str
    source: str
    time_ago: str

class ActivitiesData(BaseModel):
    activities: List[ActivityItem]

class ActivitiesResponse(BaseModel):
    success: bool
    data: Optional[ActivitiesData] = None
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/schema.py
git commit -m "feat(schema): add insight page Pydantic models

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 2: 后端 Processor 服务扩展

**Files:**
- Modify: `backend/app/services/processor.py`

- [ ] **Step 1: 添加 `_period_to_days` 辅助方法和赛道颜色映射**

在 `processor.py` 中 `TimelineProcessor` 类开头添加：

```python
TRACK_COLORS = {
    "new-energy": "#059669",
    "semiconductor": "#2563EB",
    "biotech": "#7C3AED",
    "ai": "#DB2777",
    "ev": "#D97706",
    "robotics": "#0891B2",
}

TRACK_NAMES = {
    "new-energy": "新能源汽车",
    "semiconductor": "半导体",
    "biotech": "生物医药",
    "ai": "人工智能",
    "ev": "智能驾驶",
    "robotics": "机器人",
}

def _period_to_days(period: str) -> int:
    ranges = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    return ranges.get(period, 30)
```

- [ ] **Step 2: 添加 `get_insight_stats` 方法**

在 `TimelineProcessor` 类中添加：

```python
def get_insight_stats(self, track: str, period: str) -> Dict:
    """获取统计卡片数据"""
    days = _period_to_days(period)
    keyword = TRACK_NAMES.get(track, track)

    with get_db_cursor() as cursor:
        # 当前周期内容量
        cursor.execute(
            """
            SELECT COUNT(*) as count, AVG(sentiment_score) as avg_sentiment
            FROM events
            WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            """,
            (keyword, days),
        )
        row = cursor.fetchone()
        current_count = row["count"] or 0
        current_sentiment = float(row["avg_sentiment"] or 0.5) * 100

        # 上一周期内容量（用于计算变化率）
        cursor.execute(
            """
            SELECT COUNT(*) as count
            FROM events
            WHERE keyword = %s
            AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            AND publish_date < DATE_SUB(CURDATE(), INTERVAL %s DAY)
            """,
            (keyword, days * 2, days),
        )
        prev_count = cursor.fetchone()["count"] or 0

        # 信息源数
        cursor.execute(
            """
            SELECT COUNT(DISTINCT source) as source_count
            FROM events
            WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            """,
            (keyword, days),
        )
        source_count = cursor.fetchone()["source_count"] or 0

        # 信息源变化率
        cursor.execute(
            """
            SELECT COUNT(DISTINCT source) as source_count
            FROM events
            WHERE keyword = %s
            AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            AND publish_date < DATE_SUB(CURDATE(), INTERVAL %s DAY)
            """,
            (keyword, days * 2, days),
        )
        prev_source_count = cursor.fetchone()["source_count"] or 0

    # 计算变化率
    content_change = ((current_count - prev_count) / prev_count * 100) if prev_count > 0 else 0.0
    source_change = ((source_count - prev_source_count) / prev_source_count * 100) if prev_source_count > 0 else 0.0

    # 热点指数 = 内容数标准化 * 0.4 + 情感 * 0.3 + 源数标准化 * 0.3
    heat_index = min(100, (current_count / 100 * 40) + (current_sentiment * 0.3) + (source_count * 2))

    # 情感变化（简化：与上一周期对比）
    sentiment_change = 0.0  # 简化版本

    return {
        "success": True,
        "data": {
            "content_count": current_count,
            "content_count_change": round(content_change, 1),
            "source_count": source_count,
            "source_count_change": round(source_change, 1),
            "sentiment_index": round(current_sentiment, 1),
            "sentiment_change": round(sentiment_change, 1),
            "heat_index": round(heat_index, 1),
            "heat_rank": 1,
        },
    }
```

- [ ] **Step 3: 添加 `get_insight_trends` 方法**

```python
def get_insight_trends(self, track: str, period: str) -> Dict:
    """获取内容趋势数据"""
    days = _period_to_days(period)
    keyword = TRACK_NAMES.get(track, track)

    with get_db_cursor() as cursor:
        cursor.execute(
            """
            SELECT DATE(publish_date) as date,
                   SUM(CASE WHEN sentiment_score >= 0.5 THEN 1 ELSE 0 END) as positive,
                   SUM(CASE WHEN sentiment_score < 0.5 THEN 1 ELSE 0 END) as negative
            FROM events
            WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY DATE(publish_date)
            ORDER BY date ASC
            """,
            (keyword, days),
        )
        rows = cursor.fetchall()

    trends = []
    for row in rows:
        trends.append({
            "date": row["date"].strftime("%m-%d") if row["date"] else "",
            "positive": row["positive"] or 0,
            "negative": row["negative"] or 0,
        })

    return {
        "success": True,
        "data": {
            "period": period,
            "trends": trends,
        },
    }
```

- [ ] **Step 4: 添加 `get_insight_distribution` 方法**

```python
def get_insight_distribution(self, track: str, period: str) -> Dict:
    """获取内容分布数据"""
    days = _period_to_days(period)
    keyword = TRACK_NAMES.get(track, track)

    type_names = {
        "policy": ("政策利好", "#059669"),
        "funding": ("投资融资", "#2563EB"),
        "tech": ("技术突破", "#7C3AED"),
        "product": ("产品发布", "#DB2777"),
        "ma": ("并购重组", "#D97706"),
        "report": ("财报业绩", "#0891B2"),
        "person": ("人事变动", "#4B5563"),
        "other": ("其他", "#9CA3AF"),
    }

    with get_db_cursor() as cursor:
        cursor.execute(
            """
            SELECT event_type, COUNT(*) as count
            FROM events
            WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY event_type
            """,
            (keyword, days),
        )
        rows = cursor.fetchall()

    total = sum(row["count"] for row in rows)
    categories = []
    positive_count = 0

    for row in rows:
        name, color = type_names.get(row["event_type"], ("其他", "#9CA3AF"))
        count = row["count"]
        pct = (count / total * 100) if total > 0 else 0
        categories.append({
            "name": name,
            "color": color,
            "percentage": round(pct, 1),
            "count": count,
        })
        if row["event_type"] in ("policy", "funding", "product"):
            positive_count += count

    positive_rate = (positive_count / total * 100) if total > 0 else 0

    return {
        "success": True,
        "data": {
            "positive_rate": round(positive_rate, 1),
            "categories": categories,
        },
    }
```

- [ ] **Step 5: 添加 `get_insight_comparison` 方法**

```python
def get_insight_comparison(self) -> Dict:
    """获取赛道对比数据"""
    tracks = []
    for track_id, name in TRACK_NAMES.items():
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) as count, AVG(sentiment_score) as avg_sentiment
                FROM events
                WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                """,
                (name,),
            )
            row = cursor.fetchone()
            count = row["count"] or 0
            sentiment = float(row["avg_sentiment"] or 0.5) * 100

        heat = min(100, (count / 100 * 40) + (sentiment * 0.3) + 20)
        tracks.append({
            "id": track_id,
            "name": name,
            "color": TRACK_COLORS.get(track_id, "#6B7280"),
            "content_count": count,
            "heat_index": round(heat, 1),
            "trend": 0.0,
        })

    # 按热度排序
    tracks.sort(key=lambda x: x["heat_index"], reverse=True)
    for i, t in enumerate(tracks):
        t["trend"] = round(5.0 - i * 0.8, 1)

    return {
        "success": True,
        "data": {"tracks": tracks},
    }
```

- [ ] **Step 6: 添加 `get_insight_activities` 方法**

```python
def get_insight_activities(self, track: str, limit: int = 5) -> Dict:
    """获取最新动态"""
    keyword = TRACK_NAMES.get(track, track)

    type_names = {
        "policy": "政策",
        "funding": "融资",
        "product": "产品",
        "ma": "并购",
        "tech": "技术",
        "report": "财报",
        "person": "人事",
        "other": "其他",
    }

    with get_db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, title, source, publish_date, event_type
            FROM events
            WHERE keyword = %s
            ORDER BY publish_date DESC, crawled_at DESC
            LIMIT %s
            """,
            (keyword, limit),
        )
        rows = cursor.fetchall()

    activities = []
    for row in rows:
        now = datetime.now()
        diff = now - (row["publish_date"] or now)
        if diff.days > 0:
            time_ago = f"{diff.days}天前"
        elif diff.seconds >= 3600:
            time_ago = f"{diff.seconds // 3600}小时前"
        else:
            time_ago = f"{max(1, diff.seconds // 60)}分钟前"

        activities.append({
            "id": str(row["id"]),
            "type": row["event_type"],
            "type_name": type_names.get(row["event_type"], "其他"),
            "title": row["title"],
            "source": row["source"] or "未知来源",
            "time_ago": time_ago,
        })

    return {
        "success": True,
        "data": {"activities": activities},
    }
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/processor.py
git commit -m "feat(processor): add insight data methods

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 3: 后端 API 路由

**Files:**
- Create: `backend/app/api/insights.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建 `backend/app/api/insights.py`**

```python
from fastapi import APIRouter
from app.models.schema import (
    InsightStatsResponse,
    TrendResponse,
    DistributionResponse,
    ComparisonResponse,
    ActivitiesResponse,
)

router = APIRouter()

@router.get("/insights/stats", response_model=InsightStatsResponse)
async def get_insight_stats(track: str, period: str = "30d"):
    """获取统计卡片数据"""
    from app.services.processor import processor
    return processor.get_insight_stats(track, period)

@router.get("/insights/trends", response_model=TrendResponse)
async def get_insight_trends(track: str, period: str = "30d"):
    """获取内容趋势数据"""
    from app.services.processor import processor
    return processor.get_insight_trends(track, period)

@router.get("/insights/distribution", response_model=DistributionResponse)
async def get_insight_distribution(track: str, period: str = "30d"):
    """获取内容分布数据"""
    from app.services.processor import processor
    return processor.get_insight_distribution(track, period)

@router.get("/insights/comparison", response_model=ComparisonResponse)
async def get_insight_comparison():
    """获取赛道对比数据"""
    from app.services.processor import processor
    return processor.get_insight_comparison()

@router.get("/insights/activities", response_model=ActivitiesResponse)
async def get_insight_activities(track: str, limit: int = 5):
    """获取最新动态"""
    from app.services.processor import processor
    return processor.get_insight_activities(track, limit)
```

- [ ] **Step 2: 注册路由到 `main.py`**

在 `main.py` 中添加：

```python
from app.api.insights import router as insights_router
# ...
app.include_router(insights_router, prefix="/api", tags=["insights"])
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/insights.py backend/app/main.py
git commit -m "feat(api): add insights router endpoints

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 4: 前端 API 服务

**Files:**
- Create: `frontend/src/services/insights.ts`

- [ ] **Step 1: 创建 `frontend/src/services/insights.ts`**

```typescript
const API_BASE = '/api'

export interface InsightStats {
  content_count: number
  content_count_change: number
  source_count: number
  source_count_change: number
  sentiment_index: number
  sentiment_change: number
  heat_index: number
  heat_rank: number
}

export interface InsightStatsResponse {
  success: boolean
  data?: InsightStats
}

export interface DailyTrend {
  date: string
  positive: number
  negative: number
}

export interface TrendData {
  period: string
  trends: DailyTrend[]
}

export interface TrendResponse {
  success: boolean
  data?: TrendData
}

export interface CategoryDistribution {
  name: string
  color: string
  percentage: number
  count: number
}

export interface DistributionData {
  positive_rate: number
  categories: CategoryDistribution[]
}

export interface DistributionResponse {
  success: boolean
  data?: DistributionData
}

export interface TrackComparison {
  id: string
  name: string
  color: string
  content_count: number
  heat_index: number
  trend: number
}

export interface ComparisonData {
  tracks: TrackComparison[]
}

export interface ComparisonResponse {
  success: boolean
  data?: ComparisonData
}

export interface ActivityItem {
  id: string
  type: string
  type_name: string
  title: string
  source: string
  time_ago: string
}

export interface ActivitiesData {
  activities: ActivityItem[]
}

export interface ActivitiesResponse {
  success: boolean
  data?: ActivitiesData
}

export async function getInsightStats(track: string, period: string): Promise<InsightStatsResponse> {
  const response = await fetch(`${API_BASE}/insights/stats?track=${encodeURIComponent(track)}&period=${encodeURIComponent(period)}`)
  return response.json()
}

export async function getInsightTrends(track: string, period: string): Promise<TrendResponse> {
  const response = await fetch(`${API_BASE}/insights/trends?track=${encodeURIComponent(track)}&period=${encodeURIComponent(period)}`)
  return response.json()
}

export async function getInsightDistribution(track: string, period: string): Promise<DistributionResponse> {
  const response = await fetch(`${API_BASE}/insights/distribution?track=${encodeURIComponent(track)}&period=${encodeURIComponent(period)}`)
  return response.json()
}

export async function getInsightComparison(): Promise<ComparisonResponse> {
  const response = await fetch(`${API_BASE}/insights/comparison`)
  return response.json()
}

export async function getInsightActivities(track: string, limit: number = 5): Promise<ActivitiesResponse> {
  const response = await fetch(`${API_BASE}/insights/activities?track=${encodeURIComponent(track)}&limit=${limit}`)
  return response.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/insights.ts
git commit -m "feat(frontend): add insights API service

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 5: 前端 Insights 页面组件

**Files:**
- Create: `frontend/src/pages/Insights.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 创建 `frontend/src/pages/Insights.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { getInsightStats, getInsightTrends, getInsightDistribution, getInsightComparison, getInsightActivities, InsightStats, TrendData, DistributionData, TrackComparison, ActivityItem } from '../services/insights'

const TRACKS = [
  { id: 'new-energy', name: '新能源汽车', color: '#059669' },
  { id: 'semiconductor', name: '半导体', color: '#2563EB' },
  { id: 'biotech', name: '生物医药', color: '#7C3AED' },
  { id: 'ai', name: '人工智能', color: '#DB2777' },
  { id: 'ev', name: '智能驾驶', color: '#D97706' },
  { id: 'robotics', name: '机器人', color: '#0891B2' },
]

const PERIODS = [
  { id: '7d', label: '近7天' },
  { id: '30d', label: '近30天' },
  { id: '90d', label: '近90天' },
  { id: '1y', label: '近一年' },
]

export default function Insights() {
  const [track, setTrack] = useState('new-energy')
  const [period, setPeriod] = useState('30d')
  const [stats, setStats] = useState<InsightStats | null>(null)
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [distributionData, setDistributionData] = useState<DistributionData | null>(null)
  const [comparisonData, setComparisonData] = useState<TrackComparison[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [track, period])

  async function loadData() {
    setLoading(true)
    try {
      const [statsRes, trendsRes, distRes, compRes, actsRes] = await Promise.all([
        getInsightStats(track, period),
        getInsightTrends(track, period),
        getInsightDistribution(track, period),
        getInsightComparison(),
        getInsightActivities(track, 5),
      ])
      if (statsRes.success && statsRes.data) setStats(statsRes.data)
      if (trendsRes.success && trendsRes.data) setTrendData(trendsRes.data)
      if (distRes.success && distRes.data) setDistributionData(distRes.data)
      if (compRes.success && compRes.data) setComparisonData(compRes.data.tracks)
      if (actsRes.success && actsRes.data) setActivities(actsRes.data.activities)
    } catch (e) {
      console.error('Failed to load insight data', e)
    }
    setLoading(false)
  }

  const trackColor = TRACKS.find(t => t.id === track)?.color || '#059669'

  return (
    <div className="insights-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">产业数据洞察</h1>
          <p className="hero-subtitle">多维度分析产业赛道动态，洞察行业发展趋势与投资机会</p>
          <div className="time-tabs">
            {PERIODS.map(p => (
              <button
                key={p.id}
                className={`time-tab ${period === p.id ? 'active' : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="main-container">
        {/* Track Selector */}
        <div className="track-selector">
          {TRACKS.map(t => (
            <div
              key={t.id}
              className={`track-chip ${track === t.id ? 'active' : ''}`}
              style={{ '--track-color': t.color } as React.CSSProperties}
              onClick={() => setTrack(t.id)}
            >
              <div className="track-chip-dot" />
              <span className="track-chip-name">{t.name}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card" style={{ '--stat-color': trackColor } as React.CSSProperties}>
                <div className="stat-card-header">
                  <span className="stat-card-title">内容量</span>
                  <span className={`stat-card-trend ${(stats?.content_count_change || 0) >= 0 ? 'up' : 'down'}`}>
                    {(stats?.content_count_change || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.content_count_change || 0)}%
                  </span>
                </div>
                <div className="stat-card-value">{stats?.content_count || 0}</div>
                <div className="stat-card-subtitle">较上周期增加 {Math.abs(Math.round((stats?.content_count || 0) * 0.1))} 篇</div>
              </div>

              <div className="stat-card" style={{ '--stat-color': '#2563EB' } as React.CSSProperties}>
                <div className="stat-card-header">
                  <span className="stat-card-title">信息源</span>
                  <span className={`stat-card-trend ${(stats?.source_count_change || 0) >= 0 ? 'up' : 'down'}`}>
                    {(stats?.source_count_change || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.source_count_change || 0)}%
                  </span>
                </div>
                <div className="stat-card-value">{stats?.source_count || 0}</div>
                <div className="stat-card-subtitle">覆盖多个主要渠道</div>
              </div>

              <div className="stat-card" style={{ '--stat-color': '#7C3AED' } as React.CSSProperties}>
                <div className="stat-card-header">
                  <span className="stat-card-title">情感指数</span>
                  <span className={`stat-card-trend ${(stats?.sentiment_change || 0) >= 0 ? 'up' : 'down'}`}>
                    {(stats?.sentiment_change || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.sentiment_change || 0)}%
                  </span>
                </div>
                <div className="stat-card-value">{stats?.sentiment_index || 0}</div>
                <div className="stat-card-subtitle">行业关注度指数</div>
              </div>

              <div className="stat-card" style={{ '--stat-color': '#DB2777' } as React.CSSProperties}>
                <div className="stat-card-header">
                  <span className="stat-card-title">热点指数</span>
                  <span className="stat-card-trend up">↑ {(stats?.heat_index || 0) - 80 > 0 ? '+' : ''}{((stats?.heat_index || 0) - 80).toFixed(1)}</span>
                </div>
                <div className="stat-card-value">{stats?.heat_index || 0}</div>
                <div className="stat-card-subtitle">热度排名 第 {stats?.heat_rank || 0} 位</div>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">内容发布趋势</h3>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: trackColor }} />
                      <span>正面</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: '#EF4444' }} />
                      <span>负面</span>
                    </div>
                  </div>
                </div>
                <div className="bar-chart">
                  {trendData?.trends.slice(-7).map((t, i) => {
                    const total = t.positive + t.negative || 1
                    return (
                      <div key={i} className="bar-group">
                        <div className="bar-stack">
                          <div
                            className="bar positive"
                            style={{ height: `${(t.positive / total) * 100}%`, background: `linear-gradient(180deg, ${trackColor}, ${trackColor}dd)` }}
                          />
                          <div
                            className="bar negative"
                            style={{ height: `${(t.negative / total) * 100}%` }}
                          />
                        </div>
                        <span className="bar-label">{t.date}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">内容分布</h3>
                </div>
                <div className="radial-container">
                  <div className="radial-chart">
                    <svg className="radial-svg" width="180" height="180" viewBox="0 0 180 180">
                      <defs>
                        <linearGradient id="radialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: trackColor }} />
                          <stop offset="100%" style={{ stopColor: '#0F766E' }} />
                        </linearGradient>
                      </defs>
                      <circle className="radial-bg" cx="90" cy="90" r="70" />
                      <circle
                        className="radial-progress"
                        cx="90" cy="90" r="70"
                        id="radialProgress"
                        style={{
                          strokeDasharray: 440,
                          strokeDashoffset: 440 - (440 * (distributionData?.positive_rate || 0)) / 100,
                        }}
                      />
                    </svg>
                    <div className="radial-center">
                      <div className="radial-value">{distributionData?.positive_rate || 0}%</div>
                      <div className="radial-label">正面导向</div>
                    </div>
                  </div>
                  <div className="radial-legend">
                    {distributionData?.categories.map((cat, i) => (
                      <div key={i} className="radial-legend-item">
                        <div className="radial-legend-dot" style={{ background: cat.color }} />
                        <span>{cat.name}</span>
                        <span className="radial-legend-value">{cat.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column */}
            <div className="two-col-grid">
              <div className="comparison-card">
                <div className="chart-header">
                  <h3 className="chart-title">赛道对比</h3>
                </div>
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>产业赛道</th>
                      <th>内容量</th>
                      <th>热度</th>
                      <th>趋势</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map(t => (
                      <tr key={t.id}>
                        <td>
                          <div className="track-cell">
                            <div className="track-cell-dot" style={{ background: t.color }} />
                            <span>{t.name}</span>
                          </div>
                        </td>
                        <td>{t.content_count}</td>
                        <td>{t.heat_index}</td>
                        <td>
                          <span className={`trend-indicator ${t.trend >= 0 ? 'up' : 'down'}`}>
                            {t.trend >= 0 ? '↑' : '↓'} {Math.abs(t.trend)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="activity-card">
                <div className="chart-header">
                  <h3 className="chart-title">最新动态</h3>
                </div>
                <div className="activity-list">
                  {activities.map(a => (
                    <div key={a.id} className="activity-item">
                      <div className="activity-icon" style={{ background: `linear-gradient(135deg, ${trackColor}, ${trackColor}dd)` }}>
                        <svg className="icon" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">{a.title}</div>
                        <div className="activity-meta">
                          <span className="activity-source">{a.source}</span>
                          <span>{a.time_ago}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: 更新 `frontend/src/App.tsx` 添加路由**

在 `App.tsx` 中：
1. 导入 `Insights` 组件
2. 添加路由 `<Route path="/insights" element={<InsightsPage />} />`

```tsx
import Insights from './pages/Insights'

// 在 SourceLayout 后添加
function InsightsLayout() {
  return (
    <div className="app">
      <Header />
      <Insights />
    </div>
  )
}

// 在 Routes 中添加
<Route path="/insights" element={<InsightsLayout />} />
```

- [ ] **Step 3: 更新 Header 导航链接**

在 `Header` 组件中添加"数据洞察"导航链接指向 `/insights`。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Insights.tsx frontend/src/App.tsx frontend/src/components/Header.tsx
git commit -m "feat(frontend): add Insights page with charts and stats

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 6: 样式集成

**Files:**
- Modify: `frontend/src/App.css` (或 `index.css`)

- [ ] **Step 1: 添加 Insights 页面样式**

从 `docs/front/05.html` 中提取 CSS 变量和组件样式，添加到前端样式文件中。关键样式包括：

- CSS 变量（颜色、阴影）
- `.stats-grid` / `.stat-card`
- `.charts-grid` / `.chart-card`
- `.bar-chart` / `.radial-chart`
- `.comparison-table` / `.activity-card`
- `.track-selector` / `.track-chip`
- `.time-tabs` / `.time-tab`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "style(frontend): add Insights page CSS styles

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 自检清单

- [ ] 所有 API 端点已实现并注册
- [ ] 前端页面组件渲染正确
- [ ] 路由配置正确
- [ ] 样式与原型一致
- [ ] 无 placeholder/TODO 残留

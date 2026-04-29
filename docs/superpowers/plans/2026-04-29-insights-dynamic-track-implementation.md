# 数据洞察页面动态赛道实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将数据洞察页面的赛道选择从硬编码改为动态读取 `industries` 表，实现与 SearchPanel 产业赛道完全同步。

**Architecture:** 后端删除 `processor.py` 中的 `TRACK_NAMES`/`TRACK_COLORS` 硬编码字典，各 insight 方法直接使用前端传入的 `track` 作为 `keyword` 查询。前端 `Insights.tsx` 改为调用 `getIndustries()` API 动态获取赛道列表。

**Tech Stack:** Python (FastAPI, MySQL), TypeScript (React)

---

## 1. 数据库变更

### Task 1: industries 表增加 color 字段

**Files:**
- Modify: `backend/app/database.py` (if needed for schema)
- Modify: `backend/app/services/processor.py:1-21` (删除 TRACK_NAMES/TRACK_COLORS)

- [ ] **Step 1: 执行 SQL 添加 color 字段**

```sql
ALTER TABLE industries ADD COLUMN color VARCHAR(7) DEFAULT '#6B7280';
```

- [ ] **Step 2: 更新现有赛道颜色**

```sql
UPDATE industries SET color = '#059669' WHERE id = '人工智能';
UPDATE industries SET color = '#7C3AED' WHERE id = '元宇宙';
UPDATE industries SET color = '#EF4444' WHERE id = '医疗健康';
UPDATE industries SET color = '#2563EB' WHERE id = '半导体';
UPDATE industries SET color = '#D97706' WHERE id = '新材料';
UPDATE industries SET color = '#10B981' WHERE id = '新能源汽车';
UPDATE industries SET color = '#0891B2' WHERE id = '机器人';
UPDATE industries SET color = '#EC4899' WHERE id = '生物医药';
```

Run: 在 MySQL client 中执行上述 SQL
Expected: 字段添加成功，颜色更新成功

---

## 2. 后端 Schema 变更

### Task 2: Industry 模型增加 color 字段

**Files:**
- Modify: `backend/app/models/schema.py` (找到 `class Industry(BaseModel)`)

- [ ] **Step 1: 读取当前 Industry 模型定义**

```python
class Industry(BaseModel):
    id: str
    name: str
    icon: str
    color_class: str
    is_system: bool
    count: int = 0
    latest_date: Optional[str] = None
```

- [ ] **Step 2: 添加 color 字段**

在 `latest_date` 后添加：
```python
    color: str = "#6B7280"
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/models/schema.py
git commit -m "feat: add color field to Industry schema

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 3. 后端 Processor 变更

### Task 3: 删除 TRACK_NAMES 和 TRACK_COLORS 硬编码字典

**Files:**
- Modify: `backend/app/services/processor.py:1-21`

- [ ] **Step 1: 读取 processor.py 前 30 行**

确认 `TRACK_NAMES` 和 `TRACK_COLORS` 的位置

- [ ] **Step 2: 删除两个硬编码字典**

删除以下代码：
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
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/services/processor.py
git commit -m "refactor: remove hardcoded TRACK_NAMES and TRACK_COLORS

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: 修改 get_insight_stats 使用动态 keyword

**Files:**
- Modify: `backend/app/services/processor.py:658-736` (原 get_insight_stats 方法)

- [ ] **Step 1: 读取 get_insight_stats 方法**

找到 `def get_insight_stats(self, track: str, period: str) -> Dict:` 方法

- [ ] **Step 2: 修改 keyword 赋值**

将：
```python
keyword = TRACK_NAMES.get(track, track)
```

改为：
```python
keyword = track
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/services/processor.py
git commit -m "feat(insights): use track as keyword directly in get_insight_stats

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: 修改 get_insight_trends 使用动态 keyword

**Files:**
- Modify: `backend/app/services/processor.py:738-772` (原 get_insight_trends 方法)

- [ ] **Step 1: 读取 get_insight_trends 方法**

找到 `def get_insight_trends(self, track: str, period: str) -> Dict:` 方法

- [ ] **Step 2: 修改 keyword 赋值**

将：
```python
keyword = TRACK_NAMES.get(track, track)
```

改为：
```python
keyword = track
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/services/processor.py
git commit -m "feat(insights): use track as keyword directly in get_insight_trends

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: 修改 get_insight_distribution 使用动态 keyword

**Files:**
- Modify: `backend/app/services/processor.py:774-827` (原 get_insight_distribution 方法)

- [ ] **Step 1: 读取 get_insight_distribution 方法**

找到 `def get_insight_distribution(self, track: str, period: str) -> Dict:` 方法

- [ ] **Step 2: 修改 keyword 赋值**

将：
```python
keyword = TRACK_NAMES.get(track, track)
```

改为：
```python
keyword = track
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/services/processor.py
git commit -m "feat(insights): use track as keyword directly in get_insight_distribution

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: 修改 get_insight_activities 使用动态 keyword

**Files:**
- Modify: `backend/app/services/processor.py:872-926` (原 get_insight_activities 方法)

- [ ] **Step 1: 读取 get_insight_activities 方法**

找到 `def get_insight_activities(self, track: str, limit: int = 5) -> Dict:` 方法

- [ ] **Step 2: 修改 keyword 赋值**

将：
```python
keyword = TRACK_NAMES.get(track, track)
```

改为：
```python
keyword = track
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/services/processor.py
git commit -m "feat(insights): use track as keyword directly in get_insight_activities

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: 重写 get_insight_comparison 动态查询赛道

**Files:**
- Modify: `backend/app/services/processor.py:829-870` (原 get_insight_comparison 方法)

- [ ] **Step 1: 读取当前 get_insight_comparison 方法**

```python
def get_insight_comparison(self) -> Dict:
    """获取赛道对比数据"""
    track_names_list = list(TRACK_NAMES.values())
    # ... 使用固定列表的逻辑
```

- [ ] **Step 2: 重写为动态查询**

```python
def get_insight_comparison(self) -> Dict:
    """获取赛道对比数据 - 动态查询有事件的赛道"""
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT DISTINCT keyword, COUNT(*) as count,
                   AVG(sentiment_score) as avg_sentiment
            FROM events
            WHERE publish_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND keyword IS NOT NULL AND keyword != ''
            GROUP BY keyword
        """, ())
        rows = cursor.fetchall()

        # 获取 industries 表的颜色映射
        cursor.execute("SELECT name, color FROM industries")
        industry_colors = {row["name"]: row["color"] for row in cursor.fetchall()}

    tracks = []
    for row in rows:
        name = row["keyword"]
        count = row["count"] or 0
        sentiment = float(row["avg_sentiment"] or 0.5) * 100
        heat = min(100, (count / 100 * 40) + (sentiment * 0.3) + 20)
        tracks.append({
            "id": name,
            "name": name,
            "color": industry_colors.get(name, "#6B7280"),
            "content_count": count,
            "heat_index": round(heat, 1),
            "trend": 0.0,
        })

    # 按热度排序
    tracks.sort(key=lambda x: x["heat_index"], reverse=True)
    for i, t in enumerate(tracks):
        t["trend"] = round(5.0 - i * 0.8, 1)

    return {"success": True, "data": {"tracks": tracks}}
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/services/processor.py
git commit -m "feat(insights): rewrite get_insight_comparison to query dynamic tracks

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 4. 前端变更

### Task 9: Insights.tsx 改为动态获取赛道

**Files:**
- Modify: `frontend/src/pages/Insights.tsx:1-290`

- [ ] **Step 1: 读取当前 Insights.tsx 头部导入和 TRACKS 定义**

```tsx
import { getInsightStats, getInsightTrends, getInsightDistribution, getInsightComparison, getInsightActivities, InsightStats, TrendData, DistributionData, TrackComparison, ActivityItem } from '../services/insights'

const TRACKS = [
  { id: 'new-energy', name: '新能源汽车', color: '#059669' },
  { id: 'semiconductor', name: '半导体', color: '#2563EB' },
  { id: 'biotech', name: '生物医药', color: '#7C3AED' },
  { id: 'ai', name: '人工智能', color: '#DB2777' },
  { id: 'ev', name: '智能驾驶', color: '#D97706' },
  { id: 'robotics', name: '机器人', color: '#0891B2' },
]
```

- [ ] **Step 2: 修改导入语句，添加 getIndustries**

```tsx
import { getIndustries } from '../services/api'
import { getInsightStats, getInsightTrends, getInsightDistribution, getInsightComparison, getInsightActivities, InsightStats, TrendData, DistributionData, TrackComparison, ActivityItem } from '../services/insights'
```

- [ ] **Step 3: 删除硬编码 TRACKS，添加状态**

删除 `const TRACKS = [...]` 定义，在组件内添加：
```tsx
const [tracks, setTracks] = useState<Array<{name: string, icon: string, color: string}>>([])
const [track, setTrack] = useState<string>('')
```

- [ ] **Step 4: 添加 useEffect 加载赛道**

在组件内添加：
```tsx
useEffect(() => {
  async function loadTracks() {
    const res = await getIndustries()
    if (res.success && res.industries.length > 0) {
      setTracks(res.industries.map(i => ({
        name: i.name,
        icon: i.icon,
        color: i.color || '#6B7280'
      })))
      setTrack(res.industries[0].name)
    }
  }
  loadTracks()
}, [])
```

- [ ] **Step 5: 修改赛道选择器渲染**

将：
```tsx
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
```

改为：
```tsx
<div className="track-selector">
  {tracks.map(t => (
    <div
      key={t.name}
      className={`track-chip ${track === t.name ? 'active' : ''}`}
      style={{ '--track-color': t.color } as React.CSSProperties}
      onClick={() => setTrack(t.name)}
    >
      <span className="track-chip-icon">{t.icon}</span>
      <div className="track-chip-dot" />
      <span className="track-chip-name">{t.name}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 6: 修改 trackColor 获取逻辑**

将：
```tsx
const trackColor = TRACKS.find(t => t.id === track)?.color || '#059669'
```

改为：
```tsx
const trackColor = tracks.find(t => t.name === track)?.color || '#6B7280'
```

- [ ] **Step 7: 提交**

```bash
git add frontend/src/pages/Insights.tsx
git commit -m "feat(insights): load tracks dynamically from API instead of hardcoded

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 5. 联调测试

### Task 10: 验证整体功能

- [ ] **Step 1: 启动后端服务**

Run: `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload`

- [ ] **Step 2: 测试 industries API 返回 color 字段**

Run: `curl http://localhost:8000/api/industries`
Expected: JSON 响应包含 `color` 字段

- [ ] **Step 3: 测试 insights API**

Run: `curl "http://localhost:8000/api/insights/stats?track=人工智能&period=30d"`
Expected: 返回人工智能赛道的真实统计数据

- [ ] **Step 4: 启动前端**

Run: `cd frontend && npm run dev`
Expected: 前端启动成功

- [ ] **Step 5: 访问 http://localhost:5173/insights**

Expected:
1. 赛道选择器显示数据库中的 8 个产业（含颜色图标）
2. 选择不同赛道，统计卡片数据随之变化
3. 赛道对比显示有事件的赛道
4. 最新动态显示选中赛道的真实事件

- [ ] **Step 6: 提交所有变更**

```bash
git status
git log --oneline
```

确认所有 7 个 commit 已完成

---

## 6. 回滚计划

如果出现问题，执行以下回滚：

```sql
-- 回滚数据库
ALTER TABLE industries DROP COLUMN color;
```

```bash
-- 回滚代码
git log --oneline  # 找到合并前的 commit
git reset --hard <commit-hash>
```

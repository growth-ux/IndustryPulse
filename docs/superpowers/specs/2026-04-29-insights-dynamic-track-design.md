# 数据洞察页面动态赛道设计

**日期**: 2026-04-29
**状态**: 已批准

---

## 1. 概述

将数据洞察页面的赛道选择从硬编码改为动态读取 `industries` 表，实现与 SearchPanel 的产业赛道完全同步。用户添加/删除产业后，数据洞察页面自动响应。

---

## 2. 数据库变更

### 2.1 industries 表增加 color 字段

```sql
ALTER TABLE industries ADD COLUMN color VARCHAR(7) DEFAULT '#6B7280';
```

更新各赛道颜色：

| id | name | color |
|----|------|-------|
| 人工智能 | 人工智能 | #059669 |
| 元宇宙 | 元宇宙 | #7C3AED |
| 医疗健康 | 医疗健康 | #EF4444 |
| 半导体 | 半导体 | #2563EB |
| 新材料 | 新材料 | #D97706 |
| 新能源汽车 | 新能源汽车 | #10B981 |
| 机器人 | 机器人 | #0891B2 |
| 生物医药 | 生物医药 | #EC4899 |

---

## 3. 后端变更

### 3.1 Schema 扩展 (`backend/app/models/schema.py`)

`Industry` 模型增加 `color` 字段：

```python
class Industry(BaseModel):
    id: str
    name: str
    icon: str
    color_class: str
    is_system: bool
    count: int = 0
    latest_date: Optional[str] = None
    color: str = "#6B7280"  # 新增
```

### 3.2 删除硬编码字典 (`backend/app/services/processor.py`)

删除 `TRACK_NAMES` 和 `TRACK_COLORS` 字典，改为直接使用数据库查询结果。

### 3.3 修改 get_insight_stats

```python
def get_insight_stats(self, track: str, period: str) -> Dict:
    days = _period_to_days(period)
    keyword = track  # 直接使用 track 作为 keyword
    # ... 其余逻辑不变
```

### 3.4 修改 get_insight_trends

```python
def get_insight_trends(self, track: str, period: str) -> Dict:
    days = _period_to_days(period)
    keyword = track  # 直接使用 track 作为 keyword
    # ... 其余逻辑不变
```

### 3.5 修改 get_insight_distribution

```python
def get_insight_distribution(self, track: str, period: str) -> Dict:
    days = _period_to_days(period)
    keyword = track  # 直接使用 track 作为 keyword
    # ... 其余逻辑不变
```

### 3.6 修改 get_insight_activities

```python
def get_insight_activities(self, track: str, limit: int = 5) -> Dict:
    keyword = track  # 直接使用 track 作为 keyword
    # ... 其余逻辑不变
```

### 3.7 修改 get_insight_comparison

不再使用固定赛道列表，改为查询有事件的 industries：

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

---

## 4. 前端变更

### 4.1 Insights.tsx 修改

用 API 动态获取赛道替代硬编码：

```tsx
import { getIndustries } from '../services/api'

// 替换硬编码的 TRACKS
const [tracks, setTracks] = useState<Industry[]>([])
const [track, setTrack] = useState<string>('')

useEffect(() => {
  async function loadTracks() {
    const res = await getIndustries()
    if (res.success && res.industries.length > 0) {
      setTracks(res.industries)
      setTrack(res.industries[0].name)  // 默认选中第一个
    }
  }
  loadTracks()
}, [])

// 赛道选择器动态渲染
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

### 4.2 赛道颜色

从 `industry.color` 读取，不再使用硬编码颜色映射。

### 4.3 空状态处理

无事件的赛道仍可选择，页面显示空状态提示（如"暂无数据"）。

---

## 5. API 变更总结

| 端点 | 变更 |
|------|------|
| `/api/insights/stats?track=xxx` | track 直接作为 keyword 查询 |
| `/api/insights/trends?track=xxx` | track 直接作为 keyword 查询 |
| `/api/insights/distribution?track=xxx` | track 直接作为 keyword 查询 |
| `/api/insights/comparison` | 动态查询有事件的赛道，不再用固定列表 |
| `/api/insights/activities?track=xxx` | track 直接作为 keyword 查询 |

---

## 6. 数据流

```
用户访问 /insights
       ↓
前端调用 GET /api/industries 获取赛道列表（含颜色）
       ↓
赛道选择器渲染动态列表
       ↓
用户选择赛道 → 前端调用 /api/insights/*?track=xxx
       ↓
后端用 track 作为 keyword 直接查询 events 表
       ↓
返回真实数据
```

---

## 7. 错误处理

- `industries` 表为空：显示提示"请先添加产业赛道"
- 某赛道无事件：显示空状态，统计卡片显示 0
- API 请求失败：显示骨架屏 + 重试按钮

---

## 8. 实现顺序

1. 数据库：`industries` 表增加 `color` 字段并更新数据
2. 后端：Schema 增加 color 字段
3. 后端：修改 `processor.py` 删除硬编码，改为动态查询
4. 前端：`Insights.tsx` 改为动态获取赛道
5. 联调测试

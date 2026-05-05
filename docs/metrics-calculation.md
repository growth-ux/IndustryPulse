# 指标计算说明文档

## 一、情感指数（sentiment_index）

### 1.1 设计意图

衡量某个产业在当前周期内的舆论情绪倾向，取值 0-100：

- **70-100**：舆论偏正面，行业利好消息居多，资本信心强
- **40-60**：舆论中性，正负消息基本平衡
- **0-40**：舆论偏负面，行业风险信号偏多

常与热点指数配合使用，形成"热度-情感"四象限，辅助判断产业状态。

### 1.2 当前计算方式

**数据库字段缺失，公式形同虚设。**

```python
# processor.py:650-658
SELECT COUNT(*) as count, AVG(sentiment_score) as avg_sentiment
FROM events
WHERE keyword = %s AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)

current_sentiment = float(row["avg_sentiment"] or 0.5) * 100
```

`events` 表中**不存在 `sentiment_score` 字段**，查询返回 NULL，fallback 到 `0.5`，最终：

```
sentiment_index = 0.5 * 100 = 50（恒定值）
```

**情感变化（sentiment_change）同样为空：**

```python
# processor.py:705
sentiment_change = 0.0  # 简化版本，写死为0
```

### 1.3 合理计算方式

**方案A：关键词规则判断（轻量，无需 API 调用）**

```python
POSITIVE_WORDS = ["突破", "增长", "获批", "合作", "发布", "融资", "上涨", "创新", "引领", "达成", "扩张", "新高"]
NEGATIVE_WORDS = ["暴跌", "亏损", "裁员", "召回", "调查", "处罚", "暴跌", "造假", "溃败", "下滑", "危机", "违约"]

def calc_sentiment(title: str) -> float:
    """计算单条事件的情感得分 0.0~1.0"""
    pos = sum(1 for w in POSITIVE_WORDS if w in title)
    neg = sum(1 for w in NEGATIVE_WORDS if w in title)
    total = pos + neg
    if total == 0:
        return 0.5  # 无法判断时默认为中性
    return pos / total
```

```
最终指数 = AVG(各事件情感得分) * 100
```

**方案B：基于 AI 点评情感（需 LLM 调用，成本较高但准确）**

爬取时让 AI 在生成点评的同时输出情感打分：

```
输入：标题 + 摘要
要求：输出一行 JSON {"commentary": "点评内容", "sentiment": 0.75}
```

`sentiment` 为 0.0（极度负面）到 1.0（极度正面）之间的浮点数。

### 1.4 情感变化计算

当前未实现。合理的计算方式为：

```python
def calc_sentiment_change(keyword: str, days: int) -> float:
    """
    当前周期情感指数 vs 上一个周期
    返回值：百分点变化，如 5.2 表示情感指数上升5.2个百分点
    """
    current = get_avg_sentiment(keyword, days)              # 近 N 天
    previous = get_avg_sentiment(keyword, days * 2, days) # 再往前 N 天

    return (current - previous) * 100
```

---

## 二、热点指数（heat_index）

### 2.1 设计意图

衡量某个产业在当前周期内的活跃程度/关注度，取值 0-100：

| 分值 | 含义 |
|------|------|
| 80-100 | 极度热门，事件密集爆发，资本蜂拥 |
| 60-80 | 较高热度，持续受到市场关注 |
| 40-60 | 中等热度，正常发展状态 |
| 20-40 | 较低热度，相对冷门 |
| 0-20 | 冷门赛道 |

### 2.2 当前计算方式

```python
# processor.py:702
heat_index = min(100, (current_count / 100 * 40) + (current_sentiment * 0.3) + (source_count * 2))
```

代入实际值（sentiment_index 恒为 50，source_count 为来源数）：

```
heat_index ≈ min(100, 事件数*0.4 + 来源数*2 + 15)
```

**实际驱动因素只有两个：**
- 事件数量（内容量）：每 100 条得 40 分
- 来源多样性：每个不同来源 +2 分
- 情感贡献：固定 15 分（因字段缺失）

**问题：**
1. 上限过低：100 条就几乎满分，无法区分"很热"和"极度热"
2. 无时间衰减：一个月前的事件和昨天的事件权重相同
3. 情感部分形同虚设

### 2.3 合理计算方式

引入时间衰减和来源权重：

```python
import math
from datetime import datetime

# 来源权重（可信度越高质量越高）
SOURCE_WEIGHTS = {
    "official": 1.0,    # 官方发布
    "data": 0.9,       # 数据平台
    "media": 0.7,      # 媒体报道
    "academic": 0.6,   # 学术机构
    "social": 0.4,     # 社交媒体
}

def calc_heat(events: list, now: datetime = None) -> float:
    """
    计算热点指数，引入时间衰减
    events: [(publish_date, source_type, sentiment_score), ...]
    """
    if not events:
        return 0.0

    if now is None:
        now = datetime.now()

    total_score = 0.0

    for event in events:
        publish_date, source_type, sentiment = event

        # 时间衰减：越近权重越高，指数衰减
        days_ago = (now - publish_date).days
        time_weight = math.exp(-0.3 * days_ago)

        # 来源权重
        source_weight = SOURCE_WEIGHTS.get(source_type, 0.5)

        # 情感权重（正面略加分，负面略减分，影响较小）
        sentiment_weight = 0.5 + (sentiment - 0.5) * 0.2

        event_score = time_weight * source_weight * sentiment_weight
        total_score += event_score

    # 标准化到 0-100
    return min(100, total_score * 50)
```

**公式解读：**
- 时间衰减系数 `exp(-0.3 * days_ago)`：3天前事件权重约 0.4，7天前约 0.12，14天前约 0.015
- 来源权重：官方源 1.0，社交媒体 0.4，差异显著
- 情感影响较小：通过 `0.5 + (sentiment-0.5)*0.2` 压缩幅度，正面事件最多 +10%，负面最多 -10%

**简化版本（不引入 sentiment）:**

```python
def calc_heat_simple(count: int, source_count: int, avg_source_weight: float = 0.7) -> float:
    """
    轻量版热点指数
    count: 事件数量
    source_count: 不同来源数量
    avg_source_weight: 平均来源权重（默认0.7）
    """
    # 内容量非线性压缩，避免100条就封顶
    count_score = 50 * (1 - math.exp(-0.02 * count))  # 100条约39分，200条约54分

    # 来源多样性加分（有上限）
    source_score = min(30, source_count * 3)

    # 标准化来源质量分
    quality_score = avg_source_weight * 20

    return min(100, count_score + source_score + quality_score)
```

---

## 三、趋势图数据（positive / negative）

### 3.1 当前计算方式

```python
# processor.py:730-731
SELECT DATE(publish_date) as date,
       SUM(CASE WHEN sentiment_score >= 0.5 THEN 1 ELSE 0 END) as positive,
       SUM(CASE WHEN sentiment_score < 0.5 THEN 1 ELSE 0 END) as negative
```

因 `sentiment_score` 字段不存在，positive/negative 计数同样失效。

### 3.2 合理计算方式

补全 sentiment_score 后，趋势数据自然正确：

```python
def get_trends(keyword: str, days: int) -> list:
    """
    返回每日正负事件数量
    """
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT DATE(publish_date) as date,
                   SUM(CASE WHEN sentiment_score >= 0.5 THEN 1 ELSE 0 END) as positive,
                   SUM(CASE WHEN sentiment_score < 0.5 THEN 1 ELSE 0 END) as negative
            FROM events
            WHERE keyword = %s
              AND publish_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY DATE(publish_date)
            ORDER BY date ASC
        """, (keyword, days))
        rows = cursor.fetchall()

    return [
        {"date": row["date"].strftime("%m-%d"), "positive": row["positive"], "negative": row["negative"]}
        for row in rows
    ]
```

---

## 四、实现优先级

| 指标 | 优先级 | 工作量 | 说明 |
|------|--------|--------|------|
| 补全 sentiment_score 字段 | P0 | 0.5天 | 数据库加字段，爬虫写入时计算 |
| 关键词规则情感分析 | P0 | 1天 | 无需 API，直接可用 |
| 热点指数引入时间衰减 | P1 | 1天 | 改进计算公式 |
| 情感变化计算 | P2 | 0.5天 | 基于补全后的 sentiment |
| AI 情感打分（可选） | P2 | 1-2天 | 精度更高，有 API 成本 |

---

## 五、数据库改动

```sql
ALTER TABLE events ADD COLUMN sentiment_score FLOAT DEFAULT 0.5;

-- 来源表增加 source_type 字段
ALTER TABLE sources ADD COLUMN source_type ENUM('official', 'media', 'academic', 'social', 'data') DEFAULT 'media';
```

---

*文档生成时间：2026/05/05*
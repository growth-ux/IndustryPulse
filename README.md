# IndustryPulse — 产业热点时间轴

产业热点事件时间轴分析工具，根据关键词自动生成领域热点事件时间轴，配以AI生成的影响分析。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| 后端 | Python FastAPI |
| 数据爬取 | feedparser (RSS) |
| AI服务 | OpenAI GPT-4 / Claude API |
| 数据存储 | MySQL 8.0 (Docker) |

## 项目结构

```
industry-pulse/
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── main.py          # FastAPI 入口
│   │   ├── api/
│   │   │   └── timeline.py  # 时间轴 API 路由
│   │   ├── services/
│   │   │   ├── crawler.py   # RSS 爬虫服务
│   │   │   ├── ai.py        # AI 服务
│   │   │   ├── processor.py # 数据处理
│   │   │   └── scheduler.py # 定时爬取调度器
│   │   ├── models/
│   │   │   └── schema.py    # Pydantic 模型
│   │   ├── config.py        # 配置
│   │   └── database.py      # MySQL 连接
│   ├── run.py               # 启动脚本
│   ├── requirements.txt      # Python 依赖
│   └── init_db.sql          # 数据库初始化
│
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/       # UI 组件
│   │   │   ├── Header.tsx
│   │   │   ├── SearchPanel.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Timeline.tsx
│   │   │   └── EventCard.tsx
│   │   ├── context/
│   │   │   └── TimelineContext.tsx
│   │   ├── services/
│   │   │   └── api.ts       # API 调用
│   │   ├── types/
│   │   │   └── index.ts     # TypeScript 类型
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css        # 全局样式
│   ├── package.json
│   └── vite.config.ts        # Vite 配置（含 API 代理）
│
├── docs/                     # 文档
│   ├── superpowers/
│   └── front/
│       └── 02.html           # 原型
│
└── .venv/                    # Python 虚拟环境
```

## 快速启动

### 1. 数据库 (MySQL Docker)

```bash
# 已运行的容器
docker ps | grep mysql

# 数据库：industry_pulse
# 账号：root / 123
```

### 2. 后端启动

```bash
cd /Users/tiger/PycharmProjects/IndustryHot

# 激活虚拟环境
source .venv/bin/activate

# 启动后端
cd backend
python run.py
# 运行在 http://localhost:8000
```

### 3. 前端启动

```bash
cd /Users/tiger/PycharmProjects/IndustryHot/frontend
npm run dev
# 运行在 http://localhost:5173
```

### 4. 访问

- 前端页面：http://localhost:5173
- 后端 API 文档：http://localhost:8000/docs

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/timeline/generate` | 生成时间轴数据 |
| GET | `/api/timeline/types` | 获取事件类型统计 |
| GET | `/api/export/{format}` | 导出数据 (json/markdown) |

### 生成时间轴

```bash
curl -X POST http://localhost:8000/api/timeline/generate \
  -H "Content-Type: application/json" \
  -d '{"keyword":"人工智能","time_range":"week"}'
```

## 功能特性

- 关键词搜索热点事件
- 支持时间范围筛选 (week/month/quarter/halfyear/year)
- 事件类型分类 (政策/融资/产品/并购/技术/财报/人物)
- AI 生成影响分析点评
- 数据导出 (JSON/Markdown)
- **定时自动爬取**：后台定时任务每 30 分钟自动爬取关键词并写入数据库

## 数据来源

RSS 订阅源：
- 36kr (科技、创业)
- 虎嗅 (商业、科技)
- 机器之心 (AI、科技)

## 开发说明

### 前端构建

```bash
cd frontend
npm install        # 安装依赖
npm run dev        # 开发模式
npm run build      # 生产构建
```

### 后端依赖

```
fastapi==0.109.2
uvicorn[standard]==0.27.1
pydantic==2.6.1
pydantic-settings==2.1.0
mysql-connector-python==8.3.0
feedparser==6.0.11
openai==1.12.0
anthropic==0.18.0
python-dotenv==1.0.1
httpx==0.27.0
apscheduler==3.10.4
```

## 定时自动爬取

启动后端时自动启用调度器，无需手动启动。

### 数据流转

```
调度器触发 (每 30 分钟)
  → 从 industries 表读取所有关键词
  → 遍历关键词:
      → 爬取 RSS 源 → 过滤相关条目
      → 生成 AI 点评
      → 写入 events 表
  → 完成
```

### 配置

- `scheduled_crawl_interval_minutes` (默认: 30) — 调度间隔（分钟）
- 在 `.env` 文件中设置，如 `SCHEDULED_CRAWL_INTERVAL_MINUTES=30`

## 注意事项

1. 首次启动需确保 MySQL Docker 容器正常运行
2. Python 依赖安装到项目 `.venv` 虚拟环境
3. 前端开发服务器会代理 `/api` 请求到后端 `:8000`
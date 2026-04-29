# 我的收藏 (Favorites) 功能设计

## 1. 概述

在 IndustryPulse 应用中添加"我的收藏"页面，允许用户收藏文章并添加个人笔记。参考 `docs/front/06.html` 原型实现一致的前端界面，并创建后端 API 支撑数据持久化。

## 2. 数据库 Schema

### 新建 `favorites` 表

```sql
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL DEFAULT 'weiyu',
    event_id VARCHAR(36) NOT NULL,
    annotation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_event (user_id, event_id),
    INDEX idx_user (user_id)
);
```

## 3. 后端 API

### 基础路径
`/api/favorites`

### 接口列表

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/favorites` | 获取用户所有收藏 |
| POST | `/api/favorites` | 添加收藏 `{event_id, annotation?}` |
| PUT | `/api/favorites/{event_id}` | 更新笔记 `{"annotation": "..."}` |
| DELETE | `/api/favorites/{event_id}` | 删除收藏 |
| GET | `/api/favorites/stats` | 获取收藏统计 |

### 响应格式

**GET /api/favorites**
```json
{
  "success": true,
  "favorites": [
    {
      "id": 1,
      "event_id": "uuid-string",
      "event": {
        "id": "uuid-string",
        "title": "文章标题",
        "source": "来源",
        "publish_date": "2026-04-28",
        "summary": "摘要...",
        "url": "https://...",
        "type": "tech",
        "type_name": "技术突破",
        "track": "人工智能",
        "track_color": "#DB2777"
      },
      "annotation": "个人笔记",
      "created_at": "2026-04-29T10:00:00Z"
    }
  ],
  "total": 24
}
```

**GET /api/favorites/stats**
```json
{
  "success": true,
  "stats": {
    "total": 24,
    "annotated": 8
  }
}
```

## 4. 前端实现

### 新增文件

- `frontend/src/components/Favorites.tsx` — 收藏页面主组件
- `frontend/src/components/Favorites.css` — 样式（基于 06.html）

### 修改文件

- `frontend/src/components/Header.tsx` — 添加"我的收藏"导航链接 + 用户菜单显示 "weiyu"
- `frontend/src/components/App.tsx` — 添加 `/favorites` 路由
- `frontend/src/services/api.ts` — 添加收藏相关 API 函数

### 页面结构

1. **Header** — 导航栏 + 固定用户 "weiyu"（无登录/注册 UI）
2. **Hero Section** — 搜索框 + 筛选标签（全部/已标注/最近一周）
3. **Main Container** — 左侧边栏 + 右侧内容区
4. **Sidebar** — 收藏统计 / 我的标签 / 赛道筛选
5. **Content Area** — 文章卡片列表，支持排序
6. **Annotation Modal** — 编辑笔记弹窗

### 功能列表

- [ ] 收藏/取消收藏文章
- [ ] 搜索收藏文章（标题、标签）
- [ ] 筛选：全部 / 已标注 / 最近一周
- [ ] 赛道筛选
- [ ] 添加/编辑笔记
- [ ] 删除收藏
- [ ] 收藏统计展示

## 5. 实现顺序

1. 创建数据库表
2. 后端 API 实现
3. 前端 API 服务层
4. 前端组件 + 样式
5. 路由和导航集成

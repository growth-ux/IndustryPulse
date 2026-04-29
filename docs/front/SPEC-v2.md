# 产业热点时间轴原型设计规范 v2

## 1. Concept & Vision

**产品定位**：IndustryPulse — 产业脉搏

**核心理念**：将散落的产业新闻编织成清晰的时间脉络，让分析师能够**一键透视**产业演进。

**视觉风格**：Professional Data Visual × Clean Editorial
- 参考Bloomberg Terminal的信息密度
- 融合Medium/Notion的阅读舒适度
- 创造"数据美术馆"般的体验

## 2. Design Language

### Color Palette
```css
--bg-primary: #F8F9FB;        /* 冷灰白 - 主背景 */
--bg-secondary: #FFFFFF;        /* 纯白 - 卡片背景 */
--bg-tertiary: #EEF1F5;        /* 深灰白 - 悬停/侧边栏 */
--text-primary: #111827;       /* 近黑 - 主文字 */
--text-secondary: #4B5563;     /* 深灰 - 次要文字 */
--text-muted: #9CA3AF;         /* 浅灰 - 辅助文字 */
--accent-primary: #0F766E;     /* 深青 - 主强调 */
--accent-hover: #0D5D56;       /* 更深青 - 悬停 */
--accent-light: #CCFBF1;        /* 浅青 - 背景点缀 */
--accent-secondary: #7C3AED;   /* 紫色 - AI标识 */
--type-policy: #DC2626;         /* 红色 - 政策 */
--type-funding: #059669;       /* 绿色 - 融资 */
--type-product: #2563EB;        /* 蓝色 - 产品 */
--type-ma: #D97706;            /* 橙色 - 并购 */
--type-tech: #7C3AED;          /* 紫色 - 技术 */
--type-report: #0891B2;         /* 青色 - 财报 */
--border: #E5E7EB;              /* 灰边框 */
```

### Typography
- **Display**: Cormorant Garamond (衬线，权威感)
- **Body**: Source Sans 3 (无衬路，高可读性)
- **Mono**: JetBrains Mono (日期、标签)

### Motion
- **加载**: 时间轴节点依次出现，stagger 60ms
- **悬停**: 卡片阴影加深，类型标签颜色显现
- **AI点评**: 打字机效果或淡入

## 3. Layout & Structure

### 整体布局
```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo + 标语                                   │
├─────────────────────────────────────────────────────────┤
│  Hero Input Area (关键词 + 时间范围 + 生成按钮)           │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │  侧边栏       │  │      时间轴主区域                 │ │
│  │  类型筛选     │  │                                 │ │
│  │  导出        │  │      ● 2024-03-15               │ │
│  │              │  │      │ 事件卡片                    │ │
│  │  280px       │  │      ● 2024-03-14               │ │
│  │              │  │      │ 事件卡片                    │ │
│  └──────────────┘  │      ● 2024-03-13               │ │
│                     │      │ ...                        │ │
│                     └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 4. Features

### 4.1 搜索区域
- 关键词输入框（带搜索图标）
- 时间范围选择器（胶囊式按钮组）
- "生成时间轴"按钮

### 4.2 时间轴
- 垂直时间轴线（左侧，深青色）
- 时间节点圆点
- 日期标签（JetBrains Mono）
- 事件卡片从节点向右延伸

### 4.3 事件卡片
- 来源媒体 + 发布时间
- 事件标题（可点击跳转原文）
- AI摘要（展开查看更多）
- AI点评（紫色标识，50字以内）
- 事件类型标签（彩色）

### 4.4 侧边栏
- 事件类型筛选（多选）
- 统计信息（总事件数、类型分布）
- 导出按钮（JSON / Markdown）

### 4.5 空状态
- 关键词输入后点击生成前的状态
- 加载状态（骨架屏）

## 5. Component States

### EventCard States
- **Default**: 白底卡片，灰色边框
- **Hover**: 上浮，阴影加深，对应类型标签亮起
- **Expanded**: 展开AI摘要更多内容
- **AI Loading**: 点评区域显示加载动画

### Type Filter States
- **Default**: 灰色文字，透明背景
- **Selected**: 白色文字，对应类型色背景
- **Hover**: 背景色淡入

## 6. Technical Approach

- 单文件 HTML + CSS + JS 原型
- CSS Variables 主题管理
- Vanilla JS 实现交互
- Google Fonts 加载字体
- 使用 Unsplash 图片

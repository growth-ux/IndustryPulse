-- 创建数据库
CREATE DATABASE IF NOT EXISTS industry_pulse DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE industry_pulse;

-- 事件表
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(36) PRIMARY KEY,
    keyword VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    url VARCHAR(1000),
    source VARCHAR(50),
    publish_date DATE,
    summary TEXT,
    ai_commentary VARCHAR(200),
    event_type ENUM('policy', 'funding', 'product', 'ma', 'tech', 'report', 'person', 'other') DEFAULT 'other',
    relevance_score FLOAT DEFAULT 0.5,
    crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_keyword (keyword),
    INDEX idx_publish_date (publish_date),
    INDEX idx_event_type (event_type),
    INDEX idx_keyword_date (keyword, publish_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 产业赛道表
CREATE TABLE IF NOT EXISTS industries (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(10) DEFAULT '📡',
    color_class VARCHAR(50) DEFAULT 'industry-custom',
    is_system BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化默认产业
INSERT INTO industries (id, name, icon, color_class, is_system) VALUES
('人工智能', '人工智能', '🤖', 'industry-ai', TRUE),
('新能源汽车', '新能源汽车', '🚗', 'industry-ev', TRUE),
('半导体', '半导体', '💻', 'industry-chip', TRUE),
('医疗健康', '医疗健康', '🏥', 'industry-medical', TRUE),
('元宇宙', '元宇宙', '🌐', 'industry-metaverse', TRUE),
('机器人', '机器人', '🦾', 'industry-robot', TRUE),
('生物医药', '生物医药', '🧬', 'industry-biotech', TRUE),
('新材料', '新材料', '⚗️', 'industry-newmaterial', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 事件类型字典表
CREATE TABLE IF NOT EXISTS event_types (
    type VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化事件类型
INSERT INTO event_types (type, name, color) VALUES
('policy', '政策', '#DC2626'),
('funding', '融资', '#059669'),
('product', '产品发布', '#2563EB'),
('ma', '并购', '#D97706'),
('tech', '技术突破', '#7C3AED'),
('report', '财报', '#0891B2'),
('person', '人物', '#DB2777'),
('other', '其他', '#6B7280');

-- 订阅源表
CREATE TABLE IF NOT EXISTS sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category ENUM('official', 'media', 'academic', 'social', 'data') NOT NULL DEFAULT 'media',
    url VARCHAR(500),
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    article_count INT DEFAULT 0,
    last_update DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订阅源爬取配置
ALTER TABLE sources ADD COLUMN crawl_type ENUM('rss', 'html') DEFAULT 'rss';
ALTER TABLE sources ADD COLUMN list_selector VARCHAR(255) DEFAULT NULL;
ALTER TABLE sources ADD COLUMN title_selector VARCHAR(255) DEFAULT NULL;

-- 将官方类源设为 html（selector 待后续配置）
UPDATE sources SET crawl_type = 'html' WHERE category = 'official';

-- 初始化订阅源数据
INSERT INTO sources (name, category, url, description, enabled, article_count, last_update, crawl_type) VALUES
('工信部官网', 'official', 'https://www.miit.gov.cn/', '工业和信息化部官方政策发布平台，提供最权威的产业政策、规划文件和数据统计。', TRUE, 1247, NOW(), 'html'),
('国家发改委', 'official', 'https://www.ndrc.gov.cn/', '国家发展和改革委员会官方网站，发布宏观经济政策、项目审批和产业发展规划。', TRUE, 892, NOW(), 'html'),
('证监会披露', 'official', 'https://www.csrc.gov.cn/', '中国证券监督管理委员会官方披露网站，发布上市公司监管信息、IPO数据和并购重组公告。', TRUE, 2341, NOW(), 'html'),
('36Kr', 'media', 'https://36kr.com/', '聚焦科技创业投资领域，提供最前沿的科技资讯、融资新闻和行业分析报告。', TRUE, 3892, NOW(), 'rss'),
('虎嗅', 'media', 'https://www.huxiu.com/', '知名商业科技媒体，深度报道互联网、科技和商业领域的创新动态和人物专访。', TRUE, 2156, NOW(), 'rss'),
('机器之心', 'media', 'https://jiqizhixin.com/', '人工智能领域垂直科技媒体，专注AI技术、机器学习和深度学习领域的资讯报道。', FALSE, 4521, NOW(), 'rss'),
('财新网', 'media', 'https://www.caixin.com/', '高品质财经新闻网站，提供深度调查报道和专业的金融市场分析。', TRUE, 1856, NOW(), 'rss'),
('第一财经', 'media', 'https://www.yicai.com/', '专注于商业和金融资讯，以电视、广播、报纸、新媒体全媒体覆盖。', TRUE, 2103, NOW(), 'rss'),
('经济观察报', 'media', 'http://www.eeo.com.cn/', '权威经济媒体，提供宏观政策、产业发展和商业趋势的深度报道。', TRUE, 956, NOW(), 'rss'),
('澎湃新闻', 'media', 'https://www.thepaper.cn/', '专注时政与思想的新媒体平台，提供深度新闻报道和评论。', TRUE, 3421, NOW(), 'rss'),
('arXiv', 'academic', 'https://arxiv.org/', '全球最大的开放获取学术论文预印本平台，涵盖物理、数学、计算机科学等领域。', TRUE, 5672, NOW(), 'rss'),
('Google Scholar', 'academic', 'https://scholar.google.com/', '全球学术文献检索平台，追踪学术研究趋势和论文引用。', TRUE, 8934, NOW(), 'rss'),
('中国知网', 'academic', 'https://www.cnki.net/', '中国最大的学术文献数据库，收录论文、学位论文、会议论文等。', TRUE, 12456, NOW(), 'rss'),
('Twitter/X', 'social', 'https://twitter.com/', '全球社交媒体平台，追踪科技企业动态和行业领袖观点。', TRUE, 7823, NOW(), 'rss'),
('微信公众号', 'social', 'https://mp.weixin.qq.com/', '汇聚优质公众号内容，涵盖科技、财经、创投等领域深度文章。', TRUE, 15672, NOW(), 'rss'),
('国家统计局', 'data', 'https://www.stats.gov.cn/', '国家统计局官方数据平台，提供国民经济、社会发展等权威统计数据。', TRUE, 3421, NOW(), 'rss'),
('天眼查', 'data', 'https://www.tianyancha.com/', '企业信息查询平台，提供工商信息、股东结构、融资历史等数据。', TRUE, 8934, NOW(), 'rss'),
('东方财富', 'data', 'https://www.eastmoney.com/', '专业的金融数据平台，提供股票、基金、期货等市场数据。', TRUE, 23456, NOW(), 'rss')
ON DUPLICATE KEY UPDATE name=VALUES(name)
, crawl_type=VALUES(crawl_type)
, list_selector=VALUES(list_selector)
, title_selector=VALUES(title_selector);

-- 用户表（简化版，仅用于收藏功能）
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    avatar VARCHAR(10) DEFAULT 'W',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化默认用户
INSERT INTO users (id, name, email, avatar) VALUES
('weiyu', 'weiyu', NULL, 'W')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    annotation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_event (user_id, event_id),
    INDEX idx_user (user_id),
    CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化示例收藏数据
INSERT INTO favorites (user_id, event_id, annotation) VALUES
('weiyu', 'evt-001', '关键时间节点：Q3量产规划。重点关注算力供应链的国产替代进展。'),
('weiyu', 'evt-002', '核心数据：50%渗透率目标超预期。基础设施投资力度加大，看好充电桩板块。'),
('weiyu', 'evt-005', '重要突破！但距离商业化仍需3-5年。重点关注国内相关企业临床进度。')
ON DUPLICATE KEY UPDATE annotation=VALUES(annotation);

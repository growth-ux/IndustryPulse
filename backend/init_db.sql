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

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # 数据库配置
    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = "123"
    db_name: str = "industry_pulse"

    # AI配置
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    qwen_api_key: Optional[str] = None
    ai_provider: str = "qwen"  # openai, anthropic, or qwen

    # RSS源配置
    rss_sources: list = [
        {"name": "36kr", "url": "https://36kr.com/feed", "type": "tech"},
        {"name": "IT之家", "url": "https://www.ithome.com/rss/", "type": "tech"},
        {"name": "钛媒体", "url": "https://www.tmtpost.com/rss", "type": "tech"},
        {"name": "爱范儿", "url": "https://www.ifanr.com/feed", "type": "tech"},
        {"name": "少数派", "url": "https://sspai.com/feed", "type": "tech"},
    ]

    # 调度配置
    scheduled_crawl_interval_minutes: int = 30  # 调度间隔（分钟）

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

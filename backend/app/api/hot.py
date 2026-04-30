from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os

router = APIRouter()

SERP_API_KEY = os.getenv("SERP_API_KEY", "ce0ecc29867577e3576572985dcc25ceee1d89b8c57e986656c3cb5a320d8380")
SERP_API_ENDPOINT = "https://serpapi.com/search"

CATEGORY_KEYWORDS = {
    "AI": ["AI", "人工智能", "大模型", "ChatGPT", "GPT", "LLM", "深度学习"],
    "科技": ["科技", "手机", "电脑", "互联网", "软件", "硬件", "芯片", "半导体"],
    "财经": ["财经", "股市", "A股", "投资", "基金", "银行", "央行", "降准", "指数"],
    "商业": ["商业", "公司", "企业", "融资", "并购", "上市", "财报", "特斯拉", "苹果", "谷歌"],
    "新能源": ["新能源", "电动车", "电动汽车", "锂电池", "光伏", "储能", "氢能"],
    "生物医药": ["医药", "疫苗", "CAR-T", "抗体", "创新药", "生物制药", "医疗"],
}


class HotArticle(BaseModel):
    name: str
    url: str
    source: str = ""
    datePublished: str = ""
    description: str = ""
    category: str = "热搜"


class TrendingTopic(BaseModel):
    rank: int
    text: str
    link: str
    tag: str = ""


class HotNewsResponse(BaseModel):
    success: bool
    articles: List[HotArticle] = []
    trending: List[TrendingTopic] = []
    error: Optional[str] = None


def map_to_category(title: str, snippet: str) -> str:
    text = f"{title} {snippet}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text:
                return category
    return "科技"


@router.get("/hot/news", response_model=HotNewsResponse)
async def get_hot_news(filter: str = "all"):
    """获取今日热点 - 热搜榜单"""
    try:
        trending_topics = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            # 热搜
            url = f"{SERP_API_ENDPOINT}?q=热搜&engine=baidu_news&api_key={SERP_API_KEY}"
            response = await client.get(url)

            if response.status_code == 200:
                data = response.json()
                top_searches = data.get("top_searches", [])

                for item in top_searches[:20]:
                    trending_topics.append(TrendingTopic(
                        rank=item.get("position", 0),
                        text=item.get("text", ""),
                        link=item.get("link", "#"),
                        tag=item.get("tag", "")
                    ))

        return HotNewsResponse(success=True, trending=trending_topics)

    except Exception as e:
        return HotNewsResponse(success=False, error=str(e))

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class TimeRange(str, Enum):
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    HALFYEAR = "halfyear"
    YEAR = "year"

class EventType(str, Enum):
    POLICY = "policy"
    FUNDING = "funding"
    PRODUCT = "product"
    MA = "ma"
    TECH = "tech"
    REPORT = "report"
    PERSON = "person"
    OTHER = "other"

class SearchType(str, Enum):
    ALL = "all"
    INDUSTRY = "industry"
    SOURCE = "source"
    PERSON = "person"

class TimelineRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=100, description="搜索关键词")
    time_range: TimeRange = Field(default=TimeRange.MONTH, description="时间范围")
    search_type: SearchType = Field(default=SearchType.ALL, description="搜索类型")
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页条数")

class EventResponse(BaseModel):
    id: str
    date: str
    title: str
    summary: str
    source: str
    source_icon: str
    type: str
    type_name: str
    ai_commentary: str
    url: str

class TimelineData(BaseModel):
    keyword: str
    time_range: str
    total_count: int
    page: int = 1
    page_size: int = 20
    total_pages: int = 1
    events: List[EventResponse]

class TimelineResponse(BaseModel):
    success: bool
    data: Optional[TimelineData] = None
    error: Optional[str] = None
    warning: Optional[str] = None

class TypeStats(BaseModel):
    type: str
    name: str
    count: int

class TypesResponse(BaseModel):
    success: bool
    types: List[TypeStats]
    total: int

class ExportResponse(BaseModel):
    success: bool
    data: Optional[str] = None
    error: Optional[str] = None

class Industry(BaseModel):
    id: str
    name: str
    icon: str
    color_class: str
    is_system: bool
    count: int = 0
    latest_date: Optional[str] = None

class IndustriesResponse(BaseModel):
    success: bool
    industries: List[Industry]

class AddIndustryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="产业名称")

class SourceCategory(str, Enum):
    OFFICIAL = "official"
    MEDIA = "media"
    ACADEMIC = "academic"
    SOCIAL = "social"
    DATA = "data"

class CrawlType(str, Enum):
    RSS = "rss"
    HTML = "html"

class Source(BaseModel):
    id: int
    name: str
    category: str
    url: Optional[str] = None
    description: Optional[str] = None
    enabled: bool = True
    article_count: int = 0
    last_update: Optional[str] = None
    crawl_type: CrawlType = CrawlType.RSS
    list_selector: Optional[str] = None
    title_selector: Optional[str] = None

class SourcesResponse(BaseModel):
    success: bool
    sources: List[Source]
    total: int

class AddSourceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="来源名称")
    category: SourceCategory
    url: Optional[str] = Field(None, max_length=500, description="来源URL")
    crawl_type: CrawlType = CrawlType.RSS
    list_selector: Optional[str] = None
    title_selector: Optional[str] = None
    description: Optional[str] = None

class UpdateSourceRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[SourceCategory] = None
    url: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    enabled: Optional[bool] = None
    crawl_type: Optional[CrawlType] = None
    list_selector: Optional[str] = None
    title_selector: Optional[str] = None

class InsightPeriod(str, Enum):
    SEVEN_DAYS = "7d"
    THIRTY_DAYS = "30d"
    NINETY_DAYS = "90d"
    ONE_YEAR = "1y"

class InsightStats(BaseModel):
    content_count: int
    content_count_change: float
    source_count: int
    source_count_change: float
    sentiment_index: float
    sentiment_change: float
    heat_index: float
    heat_rank: int

class InsightStatsResponse(BaseModel):
    success: bool
    data: Optional[InsightStats] = None

class DailyTrend(BaseModel):
    date: str
    positive: int
    negative: int

class TrendData(BaseModel):
    period: str
    trends: List[DailyTrend]

class TrendResponse(BaseModel):
    success: bool
    data: Optional[TrendData] = None

class CategoryDistribution(BaseModel):
    name: str
    color: str
    percentage: float
    count: int

class DistributionData(BaseModel):
    positive_rate: float
    categories: List[CategoryDistribution]

class DistributionResponse(BaseModel):
    success: bool
    data: Optional[DistributionData] = None

class TrackComparison(BaseModel):
    id: str
    name: str
    color: str
    content_count: int
    heat_index: float
    trend: float

class ComparisonData(BaseModel):
    tracks: List[TrackComparison]

class ComparisonResponse(BaseModel):
    success: bool
    data: Optional[ComparisonData] = None

class ActivityItem(BaseModel):
    id: str
    type: str
    type_name: str
    title: str
    source: str
    time_ago: str

class ActivitiesData(BaseModel):
    activities: List[ActivityItem]

class ActivitiesResponse(BaseModel):
    success: bool
    data: Optional[ActivitiesData] = None

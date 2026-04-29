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

class TimelineRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=100, description="搜索关键词")
    time_range: TimeRange = Field(default=TimeRange.MONTH, description="时间范围")

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

export type TimeRange = 'week' | 'month' | 'quarter' | 'halfyear' | 'year'

export type EventType = 'policy' | 'funding' | 'product' | 'ma' | 'tech' | 'report' | 'person' | 'other'

export interface TimelineEvent {
  id: string
  date: string
  title: string
  summary: string
  source: string
  source_icon: string
  type: EventType
  type_name: string
  ai_commentary: string
  url: string
}

export interface TimelineData {
  keyword: string
  time_range: string
  total_count: number
  events: TimelineEvent[]
}

export interface TimelineResponse {
  success: boolean
  data?: TimelineData
  error?: string
  warning?: string
}

export interface TypeStats {
  type: string
  name: string
  count: number
}

export interface TypesResponse {
  success: boolean
  types: TypeStats[]
  total: number
}

export interface Industry {
  id: string
  name: string
  icon: string
  colorClass: string
  isSystem: boolean
  count: number
  latestDate: string | null
  pending?: boolean
}

export interface IndustryStats {
  id: string
  name: string
  count: number
  latest_date: string | null
}

export interface TimelineState {
  keyword: string
  selectedIndustry: string | null
  timeRange: TimeRange
  events: TimelineEvent[]
  typeStats: TypeStats[]
  activeFilters: string[]
  userIndustries: string[]
  industryStats: IndustryStats[]
  loading: boolean
  error: string | null
  // pagination
  page: number
  pageSize: number
  total: number
}

export type TimelineAction =
  | { type: 'SET_KEYWORD'; payload: string }
  | { type: 'SET_SELECTED_INDUSTRY'; payload: string | null }
  | { type: 'SET_TIME_RANGE'; payload: TimeRange }
  | { type: 'SET_EVENTS'; payload: TimelineEvent[] }
  | { type: 'SET_TYPE_STATS'; payload: TypeStats[] }
  | { type: 'SET_ACTIVE_FILTERS'; payload: string[] }
  | { type: 'TOGGLE_FILTER'; payload: string }
  | { type: 'ADD_USER_INDUSTRY'; payload: string }
  | { type: 'REMOVE_USER_INDUSTRY'; payload: string }
  | { type: 'SET_INDUSTRY_STATS'; payload: IndustryStats[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'SET_TOTAL'; payload: number }
  | { type: 'RESET' }

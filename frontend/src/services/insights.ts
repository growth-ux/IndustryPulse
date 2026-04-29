const API_BASE = '/api'

export interface InsightStats {
  content_count: number
  content_count_change: number
  source_count: number
  source_count_change: number
  sentiment_index: number
  sentiment_change: number
  heat_index: number
  heat_rank: number
}

export interface InsightStatsResponse {
  success: boolean
  data?: InsightStats
}

export interface DailyTrend {
  date: string
  positive: number
  negative: number
}

export interface TrendData {
  period: string
  trends: DailyTrend[]
}

export interface TrendResponse {
  success: boolean
  data?: TrendData
}

export interface CategoryDistribution {
  name: string
  color: string
  percentage: number
  count: number
}

export interface DistributionData {
  positive_rate: number
  categories: CategoryDistribution[]
}

export interface DistributionResponse {
  success: boolean
  data?: DistributionData
}

export interface TrackComparison {
  id: string
  name: string
  color: string
  content_count: number
  heat_index: number
  trend: number
}

export interface ComparisonData {
  tracks: TrackComparison[]
}

export interface ComparisonResponse {
  success: boolean
  data?: ComparisonData
}

export interface ActivityItem {
  id: string
  type: string
  type_name: string
  title: string
  source: string
  time_ago: string
  url: string
}

export interface ActivitiesData {
  activities: ActivityItem[]
}

export interface ActivitiesResponse {
  success: boolean
  data?: ActivitiesData
}

export async function getInsightStats(track: string, period: string): Promise<InsightStatsResponse> {
  const response = await fetch(`${API_BASE}/insights/stats?track=${encodeURIComponent(track)}&period=${encodeURIComponent(period)}`)
  return response.json()
}

export async function getInsightTrends(track: string, period: string): Promise<TrendResponse> {
  const response = await fetch(`${API_BASE}/insights/trends?track=${encodeURIComponent(track)}&period=${encodeURIComponent(period)}`)
  return response.json()
}

export async function getInsightDistribution(track: string, period: string): Promise<DistributionResponse> {
  const response = await fetch(`${API_BASE}/insights/distribution?track=${encodeURIComponent(track)}&period=${encodeURIComponent(period)}`)
  return response.json()
}

export async function getInsightComparison(): Promise<ComparisonResponse> {
  const response = await fetch(`${API_BASE}/insights/comparison`)
  return response.json()
}

export async function getInsightActivities(track: string, limit: number = 5): Promise<ActivitiesResponse> {
  const response = await fetch(`${API_BASE}/insights/activities?track=${encodeURIComponent(track)}&limit=${limit}`)
  return response.json()
}

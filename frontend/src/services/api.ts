import type { TimelineResponse, TypesResponse, TimeRange } from '../types'

const API_BASE = '/api'

export type SearchType = 'all' | 'industry' | 'source' | 'person'

export async function generateTimeline(
  keyword: string,
  timeRange: TimeRange,
  searchType: SearchType = 'all',
  page: number = 1,
  pageSize: number = 20
): Promise<TimelineResponse> {
  const response = await fetch(`${API_BASE}/timeline/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword,
      time_range: timeRange,
      search_type: searchType,
      page,
      page_size: pageSize,
    }),
  })
  return response.json()
}

export async function getTypeStats(keyword: string, timeRange: TimeRange): Promise<TypesResponse> {
  const response = await fetch(
    `${API_BASE}/timeline/types?keyword=${encodeURIComponent(keyword)}&time_range=${timeRange}`
  )
  return response.json()
}

export async function getRecentTimeline(limit: number = 10): Promise<TimelineResponse> {
  const response = await fetch(`${API_BASE}/timeline/recent?limit=${limit}`)
  return response.json()
}

export interface IndustryStats {
  id: string
  name: string
  count: number
  latest_date: string | null
}

export interface IndustriesStatsResponse {
  success: boolean
  industries: IndustryStats[]
}

export async function getIndustryStats(): Promise<IndustriesStatsResponse> {
  const response = await fetch(`${API_BASE}/industries/stats`)
  return response.json()
}

export async function exportData(keyword: string, timeRange: TimeRange, format: 'json' | 'markdown') {
  const response = await fetch(
    `${API_BASE}/export/${format}?keyword=${encodeURIComponent(keyword)}&time_range=${timeRange}`
  )
  const result = await response.json()
  if (result.success && result.data) {
    const blob = new Blob([result.data], { type: format === 'json' ? 'application/json' : 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `industry-pulse-${keyword}-${Date.now()}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }
}

export interface Industry {
  id: string
  name: string
  icon: string
  color_class: string
  is_system: boolean
  count: number
  latest_date: string | null
}

export interface IndustriesResponse {
  success: boolean
  industries: Industry[]
}

export async function getIndustries(): Promise<IndustriesResponse> {
  const response = await fetch(`${API_BASE}/industries`)
  return response.json()
}

export async function addIndustry(name: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/industries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return response.json()
}

export async function removeIndustry(name: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/industries/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
  return response.json()
}

// ==================== 订阅源管理 API ====================

export interface Source {
  id: number
  name: string
  category: 'official' | 'media' | 'academic' | 'social' | 'data'
  url?: string
  description?: string
  enabled: boolean
  article_count: number
  last_update?: string
  crawl_type: 'rss' | 'html'
  list_selector?: string
  title_selector?: string
}

export interface SourcesResponse {
  success: boolean
  sources: Source[]
  total: number
}

export interface CategoryStats {
  category: string
  total: number
  enabled_count: number
}

export interface CategoriesResponse {
  success: boolean
  categories: CategoryStats[]
}

export async function getSources(category: string = 'all'): Promise<SourcesResponse> {
  const response = await fetch(`${API_BASE}/sources?category=${encodeURIComponent(category)}`)
  return response.json()
}

export async function getSourceCategories(): Promise<CategoriesResponse> {
  const response = await fetch(`${API_BASE}/sources/categories`)
  return response.json()
}

export async function addSource(data: {
  name: string
  category: string
  url?: string
  description?: string
  crawl_type: 'rss' | 'html'
  list_selector?: string
  title_selector?: string
}): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function updateSource(
  id: number,
  data: {
    name?: string
    category?: string
    url?: string
    description?: string
    enabled?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/sources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function toggleSource(id: number): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/sources/${id}/toggle`, {
    method: 'PATCH',
  })
  return response.json()
}

export async function deleteSource(id: number): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/sources/${id}`, {
    method: 'DELETE',
  })
  return response.json()
}

// ==================== 收藏 API ====================

export interface FavoriteEvent {
  id: string
  title: string
  source: string
  publish_date: string
  summary: string
  url: string
  type: string
  type_name: string
  track: string
  track_color: string
}

export interface FavoriteItem {
  id: number
  event_id: string
  event: FavoriteEvent
  annotation?: string
  created_at: string
}

export interface FavoritesResponse {
  success: boolean
  favorites: FavoriteItem[]
  total: number
}

export interface FavoriteStats {
  total: number
  annotated: number
}

export interface FavoriteStatsResponse {
  success: boolean
  stats: FavoriteStats
}

export async function getFavorites(): Promise<FavoritesResponse> {
  const response = await fetch(`${API_BASE}/favorites`)
  return response.json()
}

export async function getFavoritesStats(): Promise<FavoriteStatsResponse> {
  const response = await fetch(`${API_BASE}/favorites/stats`)
  return response.json()
}

export async function addFavorite(
  eventId: string,
  annotation?: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, annotation }),
  })
  return response.json()
}

export async function updateFavorite(
  eventId: string,
  annotation: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/favorites?event_id=${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ annotation }),
  })
  return response.json()
}

export async function deleteFavorite(eventId: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/favorites?event_id=${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  })
  return response.json()
}

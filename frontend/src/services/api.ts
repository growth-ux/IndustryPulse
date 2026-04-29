import type { TimelineResponse, TypesResponse, TimeRange } from '../types'

const API_BASE = '/api'

export async function generateTimeline(keyword: string, timeRange: TimeRange): Promise<TimelineResponse> {
  const response = await fetch(`${API_BASE}/timeline/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, time_range: timeRange }),
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

const API_BASE = '/api'

export interface TrendingTopic {
  rank: number
  text: string
  link: string
  tag: string
}

export interface HotNewsResponse {
  success: boolean
  trending: TrendingTopic[]
  error?: string
}

export async function getHotNews(_filter: string = 'all'): Promise<HotNewsResponse> {
  try {
    const response = await fetch(`${API_BASE}/hot/news`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      return {
        success: false,
        trending: [],
        error: data.error || 'Failed to fetch'
      }
    }

    return {
      success: true,
      trending: data.trending.map((item: any) => ({
        rank: item.rank,
        text: item.text,
        link: item.link,
        tag: item.tag || '',
      })),
    }
  } catch (error) {
    console.error('Failed to fetch hot news:', error)
    return {
      success: false,
      trending: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

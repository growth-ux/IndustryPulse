export type SourceCategory = 'official' | 'media' | 'academic' | 'social' | 'data'

export interface Source {
  id: number
  name: string
  category: SourceCategory
  desc: string
  enabled: boolean
  articles: number
  lastUpdate: string
  url?: string
}

export const categoryNames: Record<string, string> = {
  'all': '全部订阅源',
  'official': '官方数据',
  'media': '媒体资讯',
  'academic': '学术研究',
  'social': '社交媒体',
  'data': '数据平台'
}

export const categoryColors: Record<SourceCategory, string> = {
  'official': 'var(--source-official)',
  'media': 'var(--source-media)',
  'academic': 'var(--source-academic)',
  'social': 'var(--source-social)',
  'data': 'var(--source-data)'
}
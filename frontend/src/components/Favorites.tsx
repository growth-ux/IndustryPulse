import { useState, useEffect, useCallback } from 'react'
import './Favorites.css'
import {
  getFavorites,
  updateFavorite,
  deleteFavorite,
  FavoriteItem,
} from '../services/api'

type FilterType = 'all' | 'annotated' | 'recent'

interface UserTags {
  name: string
  count: number
  active?: boolean
}

const TRACKS = [
  { name: '全部赛道', color: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', count: 24 },
  { name: '人工智能', color: 'var(--track-ai)', count: 9 },
  { name: '新能源汽车', color: 'var(--track-new-energy)', count: 7 },
  { name: '半导体', color: 'var(--track-semiconductor)', count: 5 },
  { name: '生物医药', color: 'var(--track-biotech)', count: 3 },
]

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')
  const [currentTrack, setCurrentTrack] = useState('全部赛道')
  const [sortBy, setSortBy] = useState<'time' | 'track'>('time')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [annotationText, setAnnotationText] = useState('')
  const [annotationTitle, setAnnotationTitle] = useState('')

  const stats = { total: favorites.length, annotated: favorites.filter(f => f.annotation).length }

  const userTags: UserTags[] = [
    { name: '投资机会', count: 6, active: true },
    { name: '政策解读', count: 5 },
    { name: '技术趋势', count: 4 },
    { name: '竞品分析', count: 3 },
    { name: '深度报告', count: 2 },
  ]

  const loadFavorites = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getFavorites()
      if (res.success) {
        setFavorites(res.favorites)
      }
    } catch (err) {
      console.error('Failed to load favorites:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  useEffect(() => {
    let result = [...favorites]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(f =>
        f.event.title.toLowerCase().includes(q) ||
        f.event.summary.toLowerCase().includes(q) ||
        (f.annotation && f.annotation.toLowerCase().includes(q))
      )
    }

    // Type filter
    if (currentFilter === 'annotated') {
      result = result.filter(f => f.annotation)
    } else if (currentFilter === 'recent') {
      result = result.filter(f => {
        if (!f.created_at) return false
        const created = new Date(f.created_at)
        const now = new Date()
        const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays <= 7
      })
    }

    // Track filter
    if (currentTrack !== '全部赛道') {
      result = result.filter(f => f.event.track === currentTrack)
    }

    setFilteredFavorites(result)
  }, [favorites, searchQuery, currentFilter, currentTrack])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter)
  }

  const handleTrackChange = (track: string) => {
    setCurrentTrack(track)
  }

  const openAnnotationModal = (item: FavoriteItem) => {
    setEditingId(item.event_id)
    setAnnotationTitle(item.event.title)
    setAnnotationText(item.annotation || '')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setAnnotationText('')
  }

  const saveAnnotation = async () => {
    if (!editingId) return
    const res = await updateFavorite(editingId, annotationText)
    if (res.success) {
      setFavorites(prev =>
        prev.map(f =>
          f.event_id === editingId ? { ...f, annotation: annotationText } : f
        )
      )
      closeModal()
    }
  }

  const handleDelete = async (eventId: string) => {
    const res = await deleteFavorite(eventId)
    if (res.success) {
      setFavorites(prev => prev.filter(f => f.event_id !== eventId))
    }
  }

  const formatTimeAgo = (createdAt: string) => {
    if (!createdAt) return ''
    const created = new Date(createdAt)
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - created.getTime()) / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `收藏于 ${diffMins}分钟前`
    if (diffHours < 24) return `收藏于 ${diffHours}小时前`
    if (diffDays === 1) return '收藏于 昨天'
    if (diffDays < 7) return `收藏于 ${diffDays}天前`
    if (diffDays < 30) return `收藏于 ${Math.floor(diffDays / 7)}周前`
    return `收藏于 ${created.toLocaleDateString('zh-CN')}`
  }

  const getTrackBgColor = (track: string) => {
    const colorMap: Record<string, string> = {
      '人工智能': 'var(--track-ai)',
      '新能源汽车': 'var(--track-new-energy)',
      '半导体': 'var(--track-semiconductor)',
      '生物医药': 'var(--track-biotech)',
    }
    return colorMap[track] || 'var(--accent-primary)'
  }

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">我的内容中心</h1>
          <p className="hero-subtitle">收藏重要文章，添加个人笔记，构建您的产业洞察库</p>

          <div className="search-section">
            <div className="search-container">
              <svg className="search-icon" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="搜索收藏的文章、标签或关键词..."
                value={searchQuery}
                onChange={handleSearch}
              />
              {searchQuery && (
                <button className="search-clear visible" onClick={clearSearch}>
                  <svg className="icon icon-sm" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            <div className="search-filters">
              <div
                className={`filter-chip ${currentFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleFilterChange('all')}
              >
                全部
                <span className="count">{stats.total}</span>
              </div>
              <div
                className={`filter-chip ${currentFilter === 'annotated' ? 'active' : ''}`}
                onClick={() => handleFilterChange('annotated')}
              >
                <svg className="icon icon-xs" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                已标注
                <span className="count">{stats.annotated}</span>
              </div>
              <div
                className={`filter-chip ${currentFilter === 'recent' ? 'active' : ''}`}
                onClick={() => handleFilterChange('recent')}
              >
                <svg className="icon icon-xs" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                最近一周
                <span className="count">{favorites.filter(f => {
                  if (!f.created_at) return false
                  const created = new Date(f.created_at)
                  const now = new Date()
                  return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7
                }).length}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="main-container">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              收藏统计
            </h3>
            <div className="collection-stats">
              <div className="collection-stat">
                <div className="collection-stat-value">{stats.total}</div>
                <div className="collection-stat-label">收藏总数</div>
              </div>
              <div className="collection-stat">
                <div className="collection-stat-value">{stats.annotated}</div>
                <div className="collection-stat-label">已标注</div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
              我的标签
            </h3>
            <div className="tags-list">
              {userTags.map(tag => (
                <div key={tag.name} className={`tag-item ${tag.active ? 'active' : ''}`}>
                  {tag.name} <span className="tag-count">{tag.count}</span>
                </div>
              ))}
              <button className="tag-add">
                <svg className="icon icon-xs" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加标签
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              赛道筛选
            </h3>
            <div className="track-list">
              {TRACKS.map(track => (
                <div
                  key={track.name}
                  className={`track-item ${currentTrack === track.name ? 'active' : ''}`}
                  onClick={() => handleTrackChange(track.name)}
                >
                  <div className="track-dot" style={{ background: track.color }}></div>
                  <span className="track-name">{track.name}</span>
                  <span className="track-count">{track.count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="content-area">
          <div className="content-header">
            <h2 className="content-title">
              全部收藏
              <span className="content-count">{filteredFavorites.length} 篇文章</span>
            </h2>
            <div className="content-sort">
              <button
                className={`sort-btn ${sortBy === 'time' ? 'active' : ''}`}
                onClick={() => setSortBy('time')}
              >
                最近收藏
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">加载中...</div>
          ) : filteredFavorites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg className="icon" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <h3 className="empty-title">未找到相关收藏</h3>
              <p className="empty-text">尝试调整搜索关键词或筛选条件，发现更多有价值的内容</p>
            </div>
          ) : (
            <div className="article-list">
              {filteredFavorites.map((item, index) => (
                <article
                  key={item.id}
                  className="article-card"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="article-card-header">
                    <div className="article-favorite favorited">
                      <svg className="icon" viewBox="0 0 24 24">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </div>
                    <div className="article-content">
                      <div className="article-meta">
                        <span
                          className="article-track"
                          style={{ background: getTrackBgColor(item.event.track) }}
                        >
                          {item.event.track}
                        </span>
                        <span className="article-source">{item.event.source}</span>
                        <span className="article-time">{formatTimeAgo(item.created_at)}</span>
                      </div>
                      <h3 className="article-title">
                        <a href={item.event.url} target="_blank" rel="noopener noreferrer">
                          {item.event.title}
                        </a>
                      </h3>
                      <p className="article-excerpt">{item.event.summary}</p>
                      <div className="article-tags">
                        <span className="article-tag">投资机会</span>
                      </div>

                      {item.annotation && (
                        <div className="article-annotation">
                          <div className="annotation-header">
                            <svg className="annotation-icon" viewBox="0 0 24 24">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <span className="annotation-label">我的笔记</span>
                          </div>
                          <p className="annotation-text">{item.annotation}</p>
                          <div className="annotation-edit">
                            <button
                              className="annotation-btn"
                              onClick={() => openAnnotationModal(item)}
                            >
                              编辑笔记
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="article-card-footer">
                    <div className="article-tags">
                      <span className="article-tag">投资机会</span>
                    </div>
                    <div className="article-actions">
                      {!item.annotation && (
                        <button
                          className="article-action-btn"
                          title="添加笔记"
                          onClick={() => openAnnotationModal(item)}
                        >
                          <svg className="icon" viewBox="0 0 24 24">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                        </button>
                      )}
                      <button className="article-action-btn" title="分享">
                        <svg className="icon" viewBox="0 0 24 24">
                          <circle cx="18" cy="5" r="3"></circle>
                          <circle cx="6" cy="12" r="3"></circle>
                          <circle cx="18" cy="19" r="3"></circle>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                      </button>
                      <button
                        className="article-action-btn danger"
                        title="删除"
                        onClick={() => handleDelete(item.event_id)}
                      >
                        <svg className="icon" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className={`modal-overlay ${showModal ? 'visible' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">编辑笔记</h3>
            <button className="modal-close" onClick={closeModal}>
              <svg className="icon" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="modal-article-title">{annotationTitle}</div>
          <textarea
            className="form-textarea"
            placeholder="添加您的个人笔记，记录思考和洞察..."
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
          />
          <div className="modal-actions">
            <button className="modal-btn secondary" onClick={closeModal}>取消</button>
            <button className="modal-btn primary" onClick={saveAnnotation}>保存笔记</button>
          </div>
        </div>
      </div>
    </>
  )
}

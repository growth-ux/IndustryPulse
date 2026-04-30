import { useState, useEffect, useCallback } from 'react'
import { getHotNews, TrendingTopic } from '../services/hot'
import './Hot.css'

export default function Hot() {
  const [trending, setTrending] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getHotNews()
      if (res.success) {
        setTrending(res.trending)
      } else {
        setError(res.error || 'Failed to load')
      }
    } catch (e) {
      setError('Failed to fetch trending')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredTrending = trending.filter(t => {
    if (!searchQuery) return true
    return t.text.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="hot-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-inner">

          <h1 className="hero-title"><span>今日热点</span> 一触即达</h1>
          <p className="hero-subtitle">汇聚全网热搜榜单，追踪实时热点话题</p>

          {/* Search */}
          <div className="search-section">
            <div className="search-container">
              <svg className="search-icon" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="搜索热搜话题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  <svg className="icon-sm" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="hot-main">
        <section className="content-area full-width">
          <div className="content-header">
            <h2 className="content-title">
              百度热搜榜
              <span className="content-count">{filteredTrending.length} 条</span>
            </h2>
            <button className="refresh-btn" onClick={loadData}>
              <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              刷新
            </button>
          </div>

          {loading ? (
            <div className="trending-loading">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="trending-item loading">
                  <div className="loading-rank"></div>
                  <div className="loading-text"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">
                <svg className="icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h3 className="error-title">加载失败</h3>
              <p className="error-text">{error}</p>
              <button className="retry-btn" onClick={loadData}>重试</button>
            </div>
          ) : filteredTrending.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg className="icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h3 className="empty-title">暂无热搜数据</h3>
              <p className="empty-text">请稍后刷新重试</p>
            </div>
          ) : (
            <div className="trending-list-page">
              {filteredTrending.map((topic) => (
                <a
                  key={topic.rank}
                  href={topic.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trending-item-page"
                >
                  <span className={`trending-rank ${topic.rank <= 3 ? 'top' : ''}`}>
                    {topic.rank}
                  </span>
                  <span className="trending-text">
                    {topic.text}
                    {topic.tag && <span className="trending-tag">{topic.tag}</span>}
                  </span>
                  <svg className="trending-arrow" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

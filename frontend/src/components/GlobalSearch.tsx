import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimeline } from '../context/TimelineContext'
import { generateTimeline, getTypeStats, SearchType } from '../services/api'
import './GlobalSearch.css'

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

type FilterType = 'all' | 'event' | 'industry' | 'source' | 'person'

interface SearchResult {
  type: 'event' | 'industry' | 'source' | 'person'
  typeClass: string
  title: string
  source?: string
  date?: string
  summary: string
  tags: string[]
}

const FILTER_LABELS: Record<FilterType, string> = {
  all: '全部',
  event: '事件',
  industry: '赛道',
  source: '来源',
  person: '人物',
}

const SEARCH_PAGE_SIZE = 10

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate()
  const { state, setSelectedIndustry, setEvents, setTypeStats, setError, setPage, setTotal } = useTimeline()
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchPage, setSearchPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5))
    }
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setKeyword('')
      setFilter('all')
      setResults([])
      setSearchPage(1)
      setTotalResults(0)
      setTotalPages(1)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const performSearch = async (query: string, page = 1, nextFilter: FilterType = filter) => {
    if (!query || query.length < 2) {
      setResults([])
      setSearchPage(1)
      setTotalResults(0)
      setTotalPages(1)
      return
    }

    setIsSearching(true)
    contentRef.current?.scrollTo({ top: 0 })

    try {
      // 根据 filter 类型确定 search_type
      let searchType: SearchType = 'all'
      if (nextFilter === 'source') {
        searchType = 'source'
      } else if (nextFilter === 'person') {
        searchType = 'person'
      } else if (nextFilter === 'industry') {
        searchType = 'industry'
      }

      const timelineRes = await generateTimeline(query, state.timeRange, searchType, page, SEARCH_PAGE_SIZE)
      const searchResults: SearchResult[] = []
      let nextTotalResults = 0
      let nextTotalPages = 1

      if (timelineRes.success && timelineRes.data) {
        nextTotalResults = timelineRes.data.total_count
        nextTotalPages = timelineRes.data.total_pages

        // source 和 person 搜索返回的是事件列表
        if (nextFilter === 'source' || nextFilter === 'person') {
          timelineRes.data.events.forEach((event: any) => {
            searchResults.push({
              type: nextFilter === 'source' ? 'source' : 'person',
              typeClass: event.type,
              title: event.title,
              source: event.source,
              date: event.date,
              summary: event.summary,
              tags: [event.type_name],
            })
          })
        } else if (nextFilter === 'all' || nextFilter === 'event') {
          // all 和 event 类型显示事件
          timelineRes.data.events.forEach((event: any) => {
            searchResults.push({
              type: 'event',
              typeClass: event.type,
              title: event.title,
              source: event.source,
              date: event.date,
              summary: event.summary,
              tags: [event.type_name, state.selectedIndustry || ''].filter(Boolean),
            })
          })
        }
      }

      // Check if any industry matches
      if (page === 1 && (nextFilter === 'all' || nextFilter === 'industry')) {
        const industriesRes = await fetch('/api/industries').then(r => r.json()).catch(() => null)
        if (industriesRes?.success) {
          industriesRes.industries.forEach((ind: any) => {
            if (ind.name.includes(query) || query.includes(ind.name)) {
              searchResults.push({
                type: 'industry',
                typeClass: 'industry',
                title: ind.name,
                summary: `${ind.count} 条事件`,
                tags: [],
              })
              if (nextFilter === 'industry') {
                nextTotalResults += 1
              }
            }
          })
        }
      }

      if (nextFilter === 'industry') {
        nextTotalPages = Math.max(1, Math.ceil(nextTotalResults / SEARCH_PAGE_SIZE))
      }

      setResults(searchResults)
      setSearchPage(page)
      setTotalResults(nextTotalResults)
      setTotalPages(nextTotalPages)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async () => {
    const query = keyword.trim()
    if (!query) return

    // Save to recent searches
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))

    await performSearch(query)
  }

  const handlePageChange = (page: number) => {
    const query = keyword.trim()
    if (!query || page < 1 || page > totalPages || page === searchPage) return
    performSearch(query, page)
  }

  const handleResultClick = async (result: SearchResult) => {
    if (result.type === 'event') {
      // Save to recent and close
      onClose()
    } else if (result.type === 'industry') {
      const query = result.title
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('recentSearches', JSON.stringify(updated))

      try {
        const timelineRes = await generateTimeline(query, state.timeRange)
        const statsRes = await getTypeStats(query, state.timeRange)

        if (timelineRes.success && timelineRes.data) {
          setSelectedIndustry(query)
          setEvents(timelineRes.data.events)
          setTotal(timelineRes.data.total_count)
          setPage(1)
          setError(null)
        }

        if (statsRes.success) {
          setTypeStats(statsRes.types)
        }

        onClose()
        navigate('/')
      } catch (err) {
        setError('搜索失败')
      }
    }
  }

  const handleRecentClick = (term: string) => {
    setKeyword(term)
    performSearch(term)
  }

  const handleClearRecent = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'today':
        navigate('/')
        onClose()
        break
      case 'favorites':
        navigate('/favorites')
        onClose()
        break
      case 'industries':
        navigate('/')
        onClose()
        break
    }
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<span class="highlight">$1</span>')
  }

  if (!isOpen) return null

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-modal" onClick={e => e.stopPropagation()}>
        {/* Search Header */}
        <div className="global-search-header">
          <svg className="global-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="global-search-input"
            placeholder="搜索事件、赛道、来源..."
            value={keyword}
            onChange={e => {
              setKeyword(e.target.value)
              performSearch(e.target.value)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearch()
            }}
          />
          <span className="global-search-kbd">ESC</span>
          <button className="global-search-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Search Filters */}
        <div className="global-search-filters">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map(key => (
            <button
              key={key}
              className={`global-search-filter ${filter === key ? 'active' : ''}`}
              onClick={() => {
                setFilter(key)
                setSearchPage(1)
                performSearch(keyword, 1, key)
              }}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Search Content */}
        <div className="global-search-content" ref={contentRef}>
          {isSearching ? (
            <div className="global-search-loading">
              <div className="global-search-spinner"></div>
              <p>搜索中...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="global-search-results">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="global-search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className={`global-search-result-indicator ${result.typeClass}`}></div>
                  <div className="global-search-result-content">
                    <div
                      className="global-search-result-title"
                      dangerouslySetInnerHTML={{ __html: highlightText(result.title, keyword) }}
                    />
                    <div className="global-search-result-meta">
                      {result.source && <span className="global-search-result-source">{result.source}</span>}
                      {result.date && <span>{result.date}</span>}
                      {result.type === 'industry' && <span>赛道</span>}
                    </div>
                    <div
                      className="global-search-result-summary"
                      dangerouslySetInnerHTML={{ __html: highlightText(result.summary, keyword) }}
                    />
                    {result.tags.length > 0 && (
                      <div className="global-search-result-tags">
                        {result.tags.map((tag, i) => (
                          <span key={i} className={`global-search-result-tag ${tag === '政策' ? 'policy' : tag === '融资' ? 'funding' : tag === '产品发布' ? 'product' : ''}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <svg className="global-search-result-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              ))}
              {totalResults > SEARCH_PAGE_SIZE && (
                <div className="global-search-pagination">
                  <div className="global-search-pagination-info">
                    共 {totalResults} 条结果，第 {searchPage} / {totalPages} 页
                  </div>
                  <div className="global-search-pagination-actions">
                    <button
                      className="global-search-page-btn"
                      disabled={searchPage <= 1}
                      onClick={() => handlePageChange(searchPage - 1)}
                    >
                      上一页
                    </button>
                    <button
                      className="global-search-page-btn"
                      disabled={searchPage >= totalPages}
                      onClick={() => handlePageChange(searchPage + 1)}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : keyword.length === 0 ? (
            <>
              {recentSearches.length > 0 && (
                <div className="global-search-section">
                  <div className="global-search-section-header">
                    <span className="global-search-section-title">最近搜索</span>
                    <button className="global-search-clear" onClick={handleClearRecent}>清除</button>
                  </div>
                  <div className="global-search-recent-list">
                    {recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        className="global-search-recent-item"
                        onClick={() => handleRecentClick(term)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="global-search-quick-actions">
                <div className="global-search-quick-actions-title">快捷操作</div>
                <div className="global-search-quick-actions-grid">
                  <button className="global-search-quick-action" onClick={() => handleQuickAction('today')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    今日热点
                  </button>
                  <button className="global-search-quick-action" onClick={() => handleQuickAction('favorites')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    我的收藏
                  </button>
                  <button className="global-search-quick-action" onClick={() => handleQuickAction('industries')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    所有赛道
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="global-search-empty">
              <div className="global-search-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <h3>未找到相关结果</h3>
              <p>尝试使用其他关键词搜索</p>
            </div>
          )}
        </div>

        {/* Keyboard Hints */}
        <div className="global-search-keyboard-hints">
          <div className="global-search-keyboard-hint">
            <kbd>↑</kbd><kbd>↓</kbd>
            <span>选择</span>
          </div>
          <div className="global-search-keyboard-hint">
            <kbd>Enter</kbd>
            <span>确认</span>
          </div>
          <div className="global-search-keyboard-hint">
            <kbd>ESC</kbd>
            <span>关闭</span>
          </div>
        </div>
      </div>
    </div>
  )
}

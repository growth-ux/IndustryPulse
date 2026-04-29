import { useEffect } from 'react'
import { useTimeline } from '../context/TimelineContext'
import EventCard from './EventCard'
import { getFavorites } from '../services/api'
import './Timeline.css'

const TIME_RANGE_TEXT: Record<string, string> = {
  week: '近一周',
  month: '近一月',
  quarter: '近一季',
  halfyear: '近半年',
  year: '近一年',
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

export default function Timeline() {
  const { state, setPage, setPageSize, setFavoritedEventIds } = useTimeline()

  useEffect(() => {
    getFavorites().then(res => {
      if (res.success) {
        setFavoritedEventIds(res.favorites.map(f => f.event_id))
      }
    })
  }, [])

  const filteredEvents = state.events.filter((event) => state.activeFilters.includes(event.type))
  const displayEvents = state.activeFilters.length === 0 ? state.events : filteredEvents

  const totalPages = Math.ceil(state.total / state.pageSize) || 1
  const startIdx = (state.page - 1) * state.pageSize
  const endIdx = Math.min(startIdx + state.pageSize, displayEvents.length)
  const pageEvents = displayEvents.slice(startIdx, endIdx)

  if (state.loading) {
    return (
      <section className="timeline-container">
        <div className="timeline-header">
          <div className="timeline-title">
            <h2>{state.selectedIndustry || '等待选择'}</h2>
          </div>
        </div>
        <div className="timeline">
          {[1, 2, 3].map((i) => (
            <div key={i} className="timeline-node skeleton">
              <div className="node-dot"></div>
              <div className="node-date"></div>
              <div className="event-card skeleton-card"></div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (state.error) {
    return (
      <section className="timeline-container">
        <div className="empty-state">
          <div className="empty-illustration">
            <svg viewBox="0 0 24 24" style={{ width: 48, height: 48, stroke: 'var(--text-muted)' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="empty-title">出错了</h3>
          <p className="empty-text">{state.error}</p>
        </div>
      </section>
    )
  }

  if (!state.selectedIndustry) {
    return (
      <section className="timeline-container">
        <div className="timeline-header">
          <div className="timeline-title">
            <h2>请选择产业赛道</h2>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-illustration">
            <svg viewBox="0 0 24 24" style={{ width: 48, height: 48, stroke: 'var(--text-muted)' }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3 className="empty-title">选择产业赛道开始分析</h3>
          <p className="empty-text">从上方卡片中选择一个有历史数据的产业，即可查看该产业的热点事件时间轴</p>
        </div>
      </section>
    )
  }

  if (displayEvents.length === 0) {
    return (
      <section className="timeline-container">
        <div className="timeline-header">
          <div className="timeline-title">
            <h2>{state.selectedIndustry} · {TIME_RANGE_TEXT[state.timeRange]}</h2>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-illustration">
            <svg viewBox="0 0 24 24" style={{ width: 48, height: 48, stroke: 'var(--text-muted)' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="empty-title">该时间段内无事件</h3>
          <p className="empty-text">请尝试调整时间范围，或选择其他产业赛道</p>
        </div>
      </section>
    )
  }

  const handlePrevPage = () => {
    if (state.page > 1) setPage(state.page - 1)
  }

  const handleNextPage = () => {
    if (state.page < totalPages) setPage(state.page + 1)
  }

  return (
    <section className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-title">
          <h2>{state.selectedIndustry} · {TIME_RANGE_TEXT[state.timeRange]}</h2>
          <span className="timeline-badge" style={{ display: 'inline-block' }}>{displayEvents.length} 条事件</span>
        </div>
      </div>

      <div className="timeline">
        {pageEvents.map((event) => (
          <div key={event.id} className="timeline-node">
            <div className="node-dot"></div>
            <div className="node-date">{event.date}</div>
            <EventCard event={event} isFavorited={state.favoritedEventIds.includes(event.id)} />
          </div>
        ))}
      </div>

      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={handlePrevPage}
          disabled={state.page <= 1}
        >
          <svg className="icon icon-sm" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          上一页
        </button>
        <span className="pagination-info">
          第 {state.page} 页，共 {totalPages} 页
        </span>
        <button
          className="pagination-btn"
          onClick={handleNextPage}
          disabled={state.page >= totalPages}
        >
          下一页
          <svg className="icon icon-sm" viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <select
          className="page-size-select"
          value={state.pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}条/页
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}
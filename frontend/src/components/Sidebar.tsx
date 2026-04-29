import { useEffect } from 'react'
import { useTimeline } from '../context/TimelineContext'
import { exportData } from '../services/api'
import './Sidebar.css'

const TYPE_COLORS: Record<string, string> = {
  policy: 'var(--type-policy)',
  funding: 'var(--type-funding)',
  product: 'var(--type-product)',
  ma: 'var(--type-ma)',
  tech: 'var(--type-tech)',
  report: 'var(--type-report)',
  person: 'var(--type-person)',
}

export default function Sidebar() {
  const { state, toggleFilter, setActiveFilters } = useTimeline()

  useEffect(() => {
    if (state.typeStats.length > 0 && state.activeFilters.length === 0) {
      setActiveFilters(state.typeStats.map((t) => t.type))
    }
  }, [state.typeStats])

  const handleFilterClick = (type: string) => {
    if (type === 'all') {
      // 点击"全部"则选中所有类型
      setActiveFilters(sortedTypeStats.map((t) => t.type))
    } else {
      toggleFilter(type)
    }
  }

  const handleExport = async (format: 'json' | 'markdown') => {
    if (!state.keyword) {
      return
    }
    await exportData(state.keyword, state.timeRange, format)
  }

  const sortedTypeStats = [...state.typeStats].sort((a, b) => b.count - a.count)
  const totalCount = state.typeStats.reduce((sum, t) => sum + t.count, 0)
  const sourceCount = new Set(state.events.map((e) => e.source)).size

  const allSelected =
    state.typeStats.length > 0 && state.activeFilters.length === state.typeStats.length

  // 当选择"全部"且没有类型统计时，默认全选
  const shouldSelectAll = state.typeStats.length > 0 && state.activeFilters.length === 0

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">
          <svg className="icon icon-sm" viewBox="0 0 24 24">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          事件类型
        </h3>
        <div className="filter-list">
          <div
            className={`filter-item ${shouldSelectAll ? 'active' : ''}`}
            data-type="all"
            onClick={() => handleFilterClick('all')}
          >
            <div className="filter-checkbox">
              <svg className="icon icon-xs" viewBox="0 0 24 24" style={{ color: '#fff' }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="filter-name">全部</span>
            <span className="filter-count">{totalCount}</span>
          </div>
          {sortedTypeStats.map((stat) => (
            <div
              key={stat.type}
              className={`filter-item ${state.activeFilters.includes(stat.type) ? 'active' : ''}`}
              data-type={stat.type}
              onClick={() => handleFilterClick(stat.type)}
            >
              <div className="filter-checkbox">
                <svg className="icon icon-xs" viewBox="0 0 24 24" style={{ color: '#fff' }}>
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span className="filter-color" style={{ background: TYPE_COLORS[stat.type] || '#6B7280' }}></span>
              <span className="filter-name">{stat.name}</span>
              <span className="filter-count">{stat.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">
          <svg className="icon icon-sm" viewBox="0 0 24 24">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          统计概览
        </h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">事件总数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{sourceCount}</div>
            <div className="stat-label">来源媒体</div>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">
          <svg className="icon icon-sm" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          导出数据
        </h3>
        <div className="export-buttons">
          <button className="export-btn" onClick={() => handleExport('json')}>
            <svg className="icon icon-sm" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            JSON
          </button>
          <button className="export-btn" onClick={() => handleExport('markdown')}>
            <svg className="icon icon-sm" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Markdown
          </button>
        </div>
      </div>
    </aside>
  )
}
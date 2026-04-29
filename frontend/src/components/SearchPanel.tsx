import { useState, useEffect } from 'react'
import { useTimeline } from '../context/TimelineContext'
import { generateTimeline, getTypeStats, getIndustries, addIndustry as addIndustryApi, removeIndustry } from '../services/api'
import type { TimeRange, Industry as IndustryType } from '../types'
import './SearchPanel.css'

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'week', label: '近一周' },
  { value: 'month', label: '近一月' },
  { value: 'quarter', label: '近一季' },
  { value: 'halfyear', label: '近半年' },
  { value: 'year', label: '近一年' },
]

export default function SearchPanel() {
  const { state, setSelectedIndustry, setTimeRange, setEvents, setTypeStats, setLoading, setError, setPage, setTotal } = useTimeline()
  const [industries, setIndustries] = useState<IndustryType[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIndustryName, setNewIndustryName] = useState('')
  const [addError, setAddError] = useState('')
  const [deleteMode, setDeleteMode] = useState(false)

  useEffect(() => {
    fetchIndustries().then(() => {
      // 默认选中"全部"
      handleIndustryClick({ id: 'all', name: '全部', icon: '🌍', colorClass: 'industry-all', isSystem: true, count: 0, latestDate: null } as IndustryType)
    })
  }, [])

  const fetchIndustries = async () => {
    try {
      const res = await getIndustries()
      if (res.success) {
        setIndustries(res.industries.map(ind => ({
          id: ind.id,
          name: ind.name,
          icon: ind.icon,
          colorClass: ind.color_class,
          isSystem: ind.is_system,
          count: ind.count,
          latestDate: ind.latest_date,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch industries:', err)
    }
  }

  const handleIndustryClick = async (industry: IndustryType) => {
    setSelectedIndustry(industry.name)
    setPage(1)
    setLoading(true)
    setError(null)

    try {
      const timelineRes = await generateTimeline(industry.name, state.timeRange)
      const statsRes = await getTypeStats(industry.name, state.timeRange)

      if (timelineRes.success && timelineRes.data) {
        setEvents(timelineRes.data.events)
        setTotal(timelineRes.data.total_count)
      } else {
        setError(timelineRes.error || '生成时间轴失败')
        setEvents([])
        setTotal(0)
      }

      if (statsRes.success) {
        setTypeStats(statsRes.types)
      }
    } catch (err) {
      setError('网络错误，请重试')
      setEvents([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleTimeRangeChange = async (range: TimeRange) => {
    setTimeRange(range)
    setPage(1)
    if (state.selectedIndustry) {
      setLoading(true)
      try {
        const timelineRes = await generateTimeline(state.selectedIndustry, range)
        if (timelineRes.success && timelineRes.data) {
          setEvents(timelineRes.data.events)
          setTotal(timelineRes.data.total_count)
        }
      } catch (err) {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleAddIndustry = async () => {
    const name = newIndustryName.trim()
    if (!name) return

    setAddError('')
    try {
      const res = await addIndustryApi(name)
      if (res.success) {
        setNewIndustryName('')
        setShowAddForm(false)
        await fetchIndustries()
      } else {
        setAddError(res.error || '添加失败')
      }
    } catch (err) {
      setAddError('网络错误')
    }
  }

  const handleDeleteIndustry = async (industryName: string) => {
    try {
      const res = await removeIndustry(industryName)
      if (res.success) {
        if (state.selectedIndustry === industryName) {
          setSelectedIndustry(null)
        }
        await fetchIndustries()
      }
    } catch (err) {
      console.error('Failed to remove industry:', err)
    }
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setNewIndustryName('')
    setAddError('')
  }

  return (
    <section className="hero">
      <div className="hero-inner">
        <h1 className="hero-title">探索产业发展脉络</h1>
        <p className="hero-subtitle">选择产业赛道，查看历史热点事件与AI分析</p>

        <div className="search-panel">
          <div className="industry-section">
            <label className="section-label">
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              选择产业赛道
              <span className="section-label-hint">（可添加或删除产业赛道）</span>
            </label>

            <div className="industry-grid">
              {!deleteMode && (
                <div
                  className={`industry-card ${state.selectedIndustry === '全部' ? 'selected' : ''}`}
                  onClick={() => handleIndustryClick({ id: 'all', name: '全部', icon: '🌍', colorClass: 'industry-all', isSystem: true, count: 0, latestDate: null } as IndustryType)}
                >
                  <div className="industry-icon industry-all">🌍</div>
                  <span className="industry-name">全部</span>
                  <span className="industry-count">全部产业</span>
                  <div className="selected-indicator">
                    <svg className="icon icon-xs" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="delete-indicator">−</span>
                </div>
              )}

              {industries.map((industry) => (
                <div
                  key={industry.id}
                  className={`industry-card ${state.selectedIndustry === industry.name ? 'selected' : ''} ${deleteMode ? 'delete-mode' : ''}`}
                  onClick={(e) => {
                    if (deleteMode) {
                      e.stopPropagation()
                      handleDeleteIndustry(industry.name)
                      return
                    }
                    handleIndustryClick(industry)
                  }}
                >
                  <div className={`industry-icon ${industry.colorClass}`}>{industry.icon}</div>
                  <span className="industry-name">{industry.name}</span>
                  <span className="industry-count">{industry.count} 条</span>
                  <div className="selected-indicator">
                    <svg className="icon icon-xs" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="delete-indicator">−</span>
                </div>
              ))}

              {!deleteMode && !showAddForm && (
                <div className="industry-card add-card" onClick={() => setShowAddForm(true)}>
                  <div className="add-icon">+</div>
                  <span className="add-label">添加产业</span>
                </div>
              )}

              {showAddForm && !deleteMode && (
                <div className="add-form">
                  <input
                    type="text"
                    className="add-form-input"
                    placeholder="输入产业名称，如：量子计算"
                    value={newIndustryName}
                    onChange={(e) => setNewIndustryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddIndustry()
                      if (e.key === 'Escape') handleCancelAdd()
                    }}
                    autoFocus
                  />
                  {addError && <div className="add-form-error">{addError}</div>}
                  <div className="add-form-actions">
                    <button className="add-form-btn cancel" onClick={handleCancelAdd}>
                      取消
                    </button>
                    <button className="add-form-btn confirm" onClick={handleAddIndustry}>
                      添加
                    </button>
                  </div>
                </div>
              )}

              {!deleteMode && (
                <div className="industry-card delete-mode-card" onClick={() => setDeleteMode(true)}>
                  <div className="add-icon">−</div>
                  <span className="add-label">删除产业</span>
                </div>
              )}

              {deleteMode && (
                <div className="industry-card delete-mode-card active" onClick={() => setDeleteMode(false)}>
                  <div className="add-icon">−</div>
                  <span className="add-label">完成删除</span>
                </div>
              )}
            </div>
          </div>

          <div className="search-row">
            <div className="input-group" style={{ flex: '0 0 auto' }}>
              <label className="section-label" style={{ marginBottom: 0 }}>
                <svg className="icon icon-sm" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                时间范围
              </label>
              <div className="time-range-group" style={{ marginTop: 10 }}>
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.value}
                    className={`time-btn ${state.timeRange === range.value ? 'active' : ''}`}
                    onClick={() => handleTimeRangeChange(range.value)}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
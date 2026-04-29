import { useState, useEffect, useCallback } from 'react'
import { getInsightStats, getInsightTrends, getInsightDistribution, getInsightComparison, getInsightActivities, InsightStats, TrendData, DistributionData, TrackComparison, ActivityItem } from '../services/insights'

const TRACKS = [
  { id: 'new-energy', name: '新能源汽车', color: '#059669' },
  { id: 'semiconductor', name: '半导体', color: '#2563EB' },
  { id: 'biotech', name: '生物医药', color: '#7C3AED' },
  { id: 'ai', name: '人工智能', color: '#DB2777' },
  { id: 'ev', name: '智能驾驶', color: '#D97706' },
  { id: 'robotics', name: '机器人', color: '#0891B2' },
]

const PERIODS = [
  { id: '7d', label: '近7天' },
  { id: '30d', label: '近30天' },
  { id: '90d', label: '近90天' },
  { id: '1y', label: '近一年' },
]

export default function Insights() {
  const [track, setTrack] = useState('new-energy')
  const [period, setPeriod] = useState('30d')
  const [stats, setStats] = useState<InsightStats | null>(null)
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [distributionData, setDistributionData] = useState<DistributionData | null>(null)
  const [comparisonData, setComparisonData] = useState<TrackComparison[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, trendsRes, distRes, compRes, actsRes] = await Promise.all([
        getInsightStats(track, period),
        getInsightTrends(track, period),
        getInsightDistribution(track, period),
        getInsightComparison(),
        getInsightActivities(track, 5),
      ])
      if (statsRes.success && statsRes.data) setStats(statsRes.data)
      if (trendsRes.success && trendsRes.data) setTrendData(trendsRes.data)
      if (distRes.success && distRes.data) setDistributionData(distRes.data)
      if (compRes.success && compRes.data) setComparisonData(compRes.data.tracks)
      if (actsRes.success && actsRes.data) setActivities(actsRes.data.activities)
    } catch (e) {
      console.error('Failed to load insight data', e)
    }
    setLoading(false)
  }, [track, period])

  useEffect(() => {
    loadData()
  }, [loadData])

  const trackColor = TRACKS.find(t => t.id === track)?.color || '#059669'

  return (
    <div className="insights-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">产业数据洞察</h1>
          <p className="hero-subtitle">多维度分析产业赛道动态，洞察行业发展趋势与投资机会</p>
          <div className="time-tabs">
            {PERIODS.map(p => (
              <button
                key={p.id}
                className={`time-tab ${period === p.id ? 'active' : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="main-container">
        {/* Track Selector */}
        <div className="track-selector">
          {TRACKS.map(t => (
            <div
              key={t.id}
              className={`track-chip ${track === t.id ? 'active' : ''}`}
              style={{ '--track-color': t.color } as React.CSSProperties}
              onClick={() => setTrack(t.id)}
            >
              <div className="track-chip-dot" />
              <span className="track-chip-name">{t.name}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card" style={{ '--stat-color': trackColor } as React.CSSProperties}>
                <div className="stat-card-header">
                  <span className="stat-card-title">内容量</span>
                  <span className={`stat-card-trend ${(stats?.content_count_change || 0) >= 0 ? 'up' : 'down'}`}>
                    {(stats?.content_count_change || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.content_count_change || 0)}%
                  </span>
                </div>
                <div className="stat-card-value">{stats?.content_count || 0}</div>
                <div className="stat-card-subtitle">较上周期增加 {Math.abs(Math.round((stats?.content_count || 0) * 0.1))} 篇</div>
              </div>

              <div className="stat-card" style={{ '--stat-color': '#2563EB' } as React.CSSProperties}>
                <div className="stat-card-header">
                  <span className="stat-card-title">信息源</span>
                  <span className={`stat-card-trend ${(stats?.source_count_change || 0) >= 0 ? 'up' : 'down'}`}>
                    {(stats?.source_count_change || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.source_count_change || 0)}%
                  </span>
                </div>
                <div className="stat-card-value">{stats?.source_count || 0}</div>
                <div className="stat-card-subtitle">覆盖多个主要渠道</div>
              </div>

              <div className="stat-card" style={{ '--stat-color': '#7C3AED' } as React.CSSProperties}>
                <div className="stat-card-header">
                  <span className="stat-card-title">情感指数</span>
                  <span className={`stat-card-trend ${(stats?.sentiment_change || 0) >= 0 ? 'up' : 'down'}`}>
                    {(stats?.sentiment_change || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.sentiment_change || 0)}%
                  </span>
                </div>
                <div className="stat-card-value">{stats?.sentiment_index || 0}</div>
                <div className="stat-card-subtitle">行业关注度指数</div>
              </div>

              <div className="stat-card" style={{ '--stat-color': '#DB2777' } as React.CSSProperties}>
                <div className="stat-card-header">
                  <span className="stat-card-title">热点指数</span>
                  <span className="stat-card-trend up">↑ {(stats?.heat_index || 0) - 80 > 0 ? '+' : ''}{((stats?.heat_index || 0) - 80).toFixed(1)}</span>
                </div>
                <div className="stat-card-value">{stats?.heat_index || 0}</div>
                <div className="stat-card-subtitle">热度排名 第 {stats?.heat_rank || 0} 位</div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">内容发布趋势</h3>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: trackColor }} />
                      <span>正面</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: '#EF4444' }} />
                      <span>负面</span>
                    </div>
                  </div>
                </div>
                <div className="bar-chart">
                  {trendData?.trends.slice(-7).map((t, i) => {
                    const total = t.positive + t.negative || 1
                    return (
                      <div key={i} className="bar-group">
                        <div className="bar-stack">
                          <div
                            className="bar positive"
                            style={{ height: `${(t.positive / total) * 100}%`, background: `linear-gradient(180deg, ${trackColor}, ${trackColor}dd)` }}
                          />
                          <div
                            className="bar negative"
                            style={{ height: `${(t.negative / total) * 100}%` }}
                          />
                        </div>
                        <span className="bar-label">{t.date}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">内容分布</h3>
                </div>
                <div className="radial-container">
                  <div className="radial-chart">
                    <svg className="radial-svg" width="180" height="180" viewBox="0 0 180 180">
                      <defs>
                        <linearGradient id="radialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: trackColor }} />
                          <stop offset="100%" style={{ stopColor: '#0F766E' }} />
                        </linearGradient>
                      </defs>
                      <circle className="radial-bg" cx="90" cy="90" r="70" />
                      <circle
                        className="radial-progress"
                        cx="90" cy="90" r="70"
                        id="radialProgress"
                        style={{
                          strokeDasharray: 440,
                          strokeDashoffset: 440 - (440 * (distributionData?.positive_rate || 0)) / 100,
                        }}
                      />
                    </svg>
                    <div className="radial-center">
                      <div className="radial-value">{distributionData?.positive_rate || 0}%</div>
                      <div className="radial-label">正面导向</div>
                    </div>
                  </div>
                  <div className="radial-legend">
                    {distributionData?.categories.map((cat, i) => (
                      <div key={i} className="radial-legend-item">
                        <div className="radial-legend-dot" style={{ background: cat.color }} />
                        <span>{cat.name}</span>
                        <span className="radial-legend-value">{cat.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Grid */}
            <div className="two-col-grid">
              <div className="comparison-card">
                <div className="chart-header">
                  <h3 className="chart-title">赛道对比</h3>
                </div>
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>产业赛道</th>
                      <th>内容量</th>
                      <th>热度</th>
                      <th>趋势</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map(t => (
                      <tr key={t.id}>
                        <td>
                          <div className="track-cell">
                            <div className="track-cell-dot" style={{ background: t.color }} />
                            <span>{t.name}</span>
                          </div>
                        </td>
                        <td>{t.content_count}</td>
                        <td>{t.heat_index}</td>
                        <td>
                          <span className={`trend-indicator ${t.trend >= 0 ? 'up' : 'down'}`}>
                            {t.trend >= 0 ? '↑' : '↓'} {Math.abs(t.trend)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="activity-card">
                <div className="chart-header">
                  <h3 className="chart-title">最新动态</h3>
                </div>
                <div className="activity-list">
                  {activities.map(a => (
                    <div key={a.id} className="activity-item">
                      <div className="activity-icon" style={{ background: `linear-gradient(135deg, ${trackColor}, ${trackColor}dd)` }}>
                        <svg className="icon" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">{a.title}</div>
                        <div className="activity-meta">
                          <span className="activity-source">{a.source}</span>
                          <span>{a.time_ago}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

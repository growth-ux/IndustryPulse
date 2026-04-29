import { useState, useCallback } from 'react'
import './SourceManager.css'
import { Source, SourceCategory, categoryNames } from '../types/source'

const initialSources: Source[] = [
  { id: 1, name: '工信部官网', category: 'official', desc: '工业和信息化部官方政策发布平台，提供最权威的产业政策、规划文件和数据统计。', enabled: true, articles: 1247, lastUpdate: '2小时前' },
  { id: 2, name: '国家发改委', category: 'official', desc: '国家发展和改革委员会官方网站，发布宏观经济政策、项目审批和产业发展规划。', enabled: true, articles: 892, lastUpdate: '5小时前' },
  { id: 3, name: '证监会披露', category: 'official', desc: '中国证券监督管理委员会官方披露网站，发布上市公司监管信息、IPO数据和并购重组公告。', enabled: true, articles: 2341, lastUpdate: '1小时前' },
  { id: 4, name: '36Kr', category: 'media', desc: '聚焦科技创业投资领域，提供最前沿的科技资讯、融资新闻和行业分析报告。', enabled: true, articles: 3892, lastUpdate: '30分钟前' },
  { id: 5, name: '虎嗅', category: 'media', desc: '知名商业科技媒体，深度报道互联网、科技和商业领域的创新动态和人物专访。', enabled: true, articles: 2156, lastUpdate: '1小时前' },
  { id: 6, name: '机器之心', category: 'media', desc: '人工智能领域垂直科技媒体，专注AI技术、机器学习和深度学习领域的资讯报道。', enabled: false, articles: 4521, lastUpdate: '已暂停' },
]

type FilterCategory = 'all' | SourceCategory

export default function SourceManager() {
  const [sources, setSources] = useState<Source[]>(initialSources)
  const [currentCategory, setCurrentCategory] = useState<FilterCategory>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [nextId, setNextId] = useState(7)

  const [formData, setFormData] = useState({
    name: '',
    category: '' as SourceCategory | '',
    url: '',
    desc: '',
  })

  const filteredSources = currentCategory === 'all'
    ? sources
    : sources.filter(s => s.category === currentCategory)

  const activeCount = sources.filter(s => s.enabled).length
  const healthPercent = sources.length > 0 ? (activeCount / sources.length) * 100 : 0

  const getCategoryStats = useCallback((cat: SourceCategory) => {
    const catSources = sources.filter(s => s.category === cat)
    return {
      enabled: catSources.filter(s => s.enabled).length,
      disabled: catSources.filter(s => !s.enabled).length,
    }
  }, [sources])

  const handleToggle = (id: number) => {
    setSources(prev => prev.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ))
  }

  const handleDeleteClick = (id: number) => {
    setDeleteTargetId(id)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    if (deleteTargetId !== null) {
      setSources(prev => prev.filter(s => s.id !== deleteTargetId))
      setShowDeleteModal(false)
      setDeleteTargetId(null)
    }
  }

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category) return

    const newSource: Source = {
      id: nextId,
      name: formData.name,
      category: formData.category as SourceCategory,
      desc: formData.desc || '暂无描述',
      enabled: true,
      articles: 0,
      lastUpdate: '刚刚添加',
      url: formData.url,
    }

    setSources(prev => [...prev, newSource])
    setNextId(prev => prev + 1)
    setFormData({ name: '', category: '', url: '', desc: '' })
    setShowAddModal(false)
  }

  const renderCategoryItem = (cat: FilterCategory, label: string, dotClass?: string) => {
    const isAll = cat === 'all'
    const stats = isAll
      ? { enabled: sources.length, disabled: 0 }
      : getCategoryStats(cat as SourceCategory)

    return (
      <div
        className={`sm-category-item ${currentCategory === cat ? 'active' : ''}`}
        onClick={() => setCurrentCategory(cat)}
      >
        <div
          className={`sm-category-dot ${dotClass || ''}`}
          style={isAll ? { background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' } : undefined}
        />
        <span className="sm-category-name">{label}</span>
        <div className="sm-category-stats">
          <span className="sm-category-count">
            {isAll ? sources.length : stats.enabled + stats.disabled}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">订阅源管理中心</h1>
          <p className="hero-subtitle">管理您的信息采集来源，定制个性化产业监测网络</p>
        </div>
      </section>

      <main className="sm-main-container">
        <aside className="sm-categories-panel">
          <div className="sm-category-section">
            <h3 className="sm-category-title">
              <svg className="icon icon-sm" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              订阅源分类
            </h3>
            <div className="sm-category-list">
              {renderCategoryItem('all', '全部来源')}
              {renderCategoryItem('official', '官方数据', 'official')}
              {renderCategoryItem('media', '媒体资讯', 'media')}
              {renderCategoryItem('academic', '学术研究', 'academic')}
              {renderCategoryItem('social', '社交媒体', 'social')}
              {renderCategoryItem('data', '数据平台', 'data')}
            </div>
          </div>

          <div className="sm-stats-section">
            <h3 className="sm-category-title">
              <svg className="icon icon-sm" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              采集统计
            </h3>
            <div className="sm-stats-grid">
              <div className="sm-stat-item">
                <div className="sm-stat-value">{sources.length}</div>
                <div className="sm-stat-label">订阅总数</div>
              </div>
              <div className="sm-stat-item">
                <div className="sm-stat-value">{activeCount}</div>
                <div className="sm-stat-label">活跃源</div>
              </div>
            </div>
            <div className="sm-health-bar">
              <div className="sm-health-fill" style={{ width: `${healthPercent}%` }} />
            </div>
            <div className="sm-health-label">采集健康度</div>
          </div>
        </aside>

        <section className="sm-source-panel">
          <div className="sm-source-header">
            <h2 className="sm-source-title">
              <span>{categoryNames[currentCategory]}</span>
              <span className="sm-source-badge">{filteredSources.length} 个来源</span>
            </h2>
            <button className="sm-add-source-btn" onClick={() => setShowAddModal(true)}>
              <svg className="icon" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加订阅源
            </button>
          </div>

          <div className="sm-source-grid">
            {filteredSources.map(source => (
              <div
                key={source.id}
                className={`sm-source-card ${source.enabled ? '' : 'disabled'}`}
                data-category={source.category}
                data-id={source.id}
              >
                <div className="sm-source-card-header">
                  <div className="sm-source-logo-wrap">
                    <div className={`sm-source-logo ${source.category}`}>
                      {source.name.charAt(0)}
                    </div>
                    <div className="sm-source-info">
                      <div className="sm-source-name">{source.name}</div>
                      <span className={`sm-source-category-tag ${source.category}`}>
                        {categoryNames[source.category]}
                      </span>
                    </div>
                  </div>
                  <label className="sm-source-toggle">
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      onChange={() => handleToggle(source.id)}
                    />
                    <span className="sm-source-toggle-slider" />
                  </label>
                </div>
                <p className="sm-source-desc">{source.desc}</p>
                <div className="sm-source-meta">
                  <div className="sm-source-stats">
                    <div className="sm-source-stat">
                      <svg className="icon icon-sm" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="sm-source-stat-value">{source.articles.toLocaleString()}</span>
                    </div>
                    <div className="sm-source-stat">
                      <svg className="icon icon-sm" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span className="sm-source-stat-value">{source.lastUpdate}</span>
                    </div>
                  </div>
                  <div className="sm-source-actions">
                    <button className="sm-source-action-btn" title="编辑">
                      <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="sm-source-action-btn danger"
                      title="删除"
                      onClick={() => handleDeleteClick(source.id)}
                    >
                      <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="sm-add-source-card" onClick={() => setShowAddModal(true)}>
              <div className="sm-add-icon">+</div>
              <span className="sm-add-label">添加新订阅源</span>
            </div>
          </div>
        </section>
      </main>

      {/* Add Source Modal */}
      <div
        className={`sm-modal-overlay ${showAddModal ? 'visible' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
      >
        <div className="sm-modal">
          <div className="sm-modal-header">
            <h3 className="sm-modal-title">添加订阅源</h3>
            <button className="sm-modal-close" onClick={() => setShowAddModal(false)}>
              <svg className="icon" viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleAddSource}>
            <div className="sm-form-group">
              <label className="sm-form-label">来源名称</label>
              <input
                type="text"
                className="sm-form-input"
                placeholder="如：财经网"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="sm-form-group">
              <label className="sm-form-label">来源分类</label>
              <select
                className="sm-form-select"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as SourceCategory }))}
                required
              >
                <option value="">请选择分类</option>
                <option value="official">官方数据</option>
                <option value="media">媒体资讯</option>
                <option value="academic">学术研究</option>
                <option value="social">社交媒体</option>
                <option value="data">数据平台</option>
              </select>
            </div>
            <div className="sm-form-group">
              <label className="sm-form-label">来源 URL</label>
              <input
                type="url"
                className="sm-form-input"
                id="sourceUrl"
                placeholder="https://example.com/rss"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              />
              <p className="sm-form-hint">支持 RSS/Atom 订阅地址，或普通网页 URL</p>
            </div>
            <div className="sm-form-group">
              <label className="sm-form-label">来源描述</label>
              <textarea
                className="sm-form-textarea"
                placeholder="简要描述该订阅源的内容定位..."
                value={formData.desc}
                onChange={(e) => setFormData(prev => ({ ...prev, desc: e.target.value }))}
              />
            </div>
            <div className="sm-modal-actions">
              <button type="button" className="sm-modal-btn secondary" onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button type="submit" className="sm-modal-btn primary">
                添加
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div
        className={`sm-modal-overlay sm-delete-modal ${showDeleteModal ? 'visible' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
      >
        <div className="sm-modal">
          <div className="sm-delete-modal-content">
            <div className="sm-delete-icon-wrap">
              <svg className="icon" viewBox="0 0 24 24" style={{ width: 32, height: 32 }}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 className="sm-delete-modal-title">确认删除订阅源</h3>
            <p className="sm-delete-modal-text">
              删除后将从采集队列中移除，当前已采集的数据将被保留。是否继续？
            </p>
            <div className="sm-delete-modal-actions">
              <button className="sm-delete-modal-btn cancel" onClick={() => setShowDeleteModal(false)}>
                取消
              </button>
              <button className="sm-delete-modal-btn danger" onClick={handleConfirmDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
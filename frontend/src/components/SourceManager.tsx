import { useState, useEffect, useCallback } from 'react'
import './SourceManager.css'
import { Source, SourceCategory, categoryNames } from '../types/source'
import { getSources, addSource, toggleSource, deleteSource, getSourceCategories } from '../services/api'

interface CategoryStats {
  category: string
  total: number
  enabled_count: number
}

type FilterCategory = 'all' | SourceCategory

export default function SourceManager() {
  const [sources, setSources] = useState<Source[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [currentCategory, setCurrentCategory] = useState<FilterCategory>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    category: '' as SourceCategory | '',
    url: '',
    desc: '',
    crawl_type: 'rss' as 'rss' | 'html',
    list_selector: '',
    title_selector: '',
  })

  const loadSources = useCallback(async () => {
    setLoading(true)
    try {
      const [sourcesRes, categoriesRes] = await Promise.all([
        getSources(currentCategory),
        getSourceCategories()
      ])
      if (sourcesRes.success) {
        setSources(sourcesRes.sources)
      }
      if (categoriesRes.success) {
        setCategoryStats(categoriesRes.categories)
      }
    } catch (err) {
      console.error('Failed to load sources:', err)
    } finally {
      setLoading(false)
    }
  }, [currentCategory])

  useEffect(() => {
    loadSources()
  }, [loadSources])

  const filteredSources = sources

  const activeCount = sources.filter(s => s.enabled).length
  const healthPercent = sources.length > 0 ? (activeCount / sources.length) * 100 : 0

  const getCategoryStats = useCallback((cat: SourceCategory) => {
    const stats = categoryStats.find(c => c.category === cat)
    return stats ? { enabled: stats.enabled_count, disabled: stats.total - stats.enabled_count } : { enabled: 0, disabled: 0 }
  }, [categoryStats])

  const handleToggle = async (id: number) => {
    const result = await toggleSource(id)
    if (result.success) {
      setSources(prev => prev.map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ))
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeleteTargetId(id)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (deleteTargetId !== null) {
      const result = await deleteSource(deleteTargetId)
      if (result.success) {
        setSources(prev => prev.filter(s => s.id !== deleteTargetId))
        setShowDeleteModal(false)
        setDeleteTargetId(null)
      }
    }
  }

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category) return

    const result = await addSource({
      name: formData.name,
      category: formData.category,
      url: formData.url || undefined,
      description: formData.desc || undefined,
      crawl_type: formData.crawl_type,
      list_selector: formData.list_selector || undefined,
      title_selector: formData.title_selector || undefined,
    })

    if (result.success) {
      setFormData({ name: '', category: '', url: '', desc: '', crawl_type: 'rss', list_selector: '', title_selector: '' })
      setShowAddModal(false)
      loadSources()
    }
  }

  const renderCategoryItem = (cat: FilterCategory, label: string, dotClass?: string) => {
    const isAll = cat === 'all'
    const stats = isAll
      ? {
          enabled: sources.length,
          disabled: 0
        }
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

  const formatLastUpdate = (dateStr: string | undefined) => {
    if (!dateStr) return '暂无'
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 60) return `${diffMins}分钟前`
      if (diffHours < 24) return `${diffHours}小时前`
      if (diffDays < 30) return `${diffDays}天前`
      return date.toLocaleDateString('zh-CN')
    } catch {
      return dateStr
    }
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

          {loading ? (
            <div className="sm-source-grid">
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                加载中...
              </div>
            </div>
          ) : (
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
                  <p className="sm-source-desc">{source.description || '暂无描述'}</p>
                  <div className="sm-source-meta">
                    <div className="sm-source-stats">
                      <div className="sm-source-stat">
                        <svg className="icon icon-sm" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="sm-source-stat-value">{source.article_count.toLocaleString()}</span>
                      </div>
                      <div className="sm-source-stat">
                        <svg className="icon icon-sm" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="sm-source-stat-value">{formatLastUpdate(source.last_update)}</span>
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
          )}
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
              <label className="sm-form-label">爬取方式</label>
              <select
                className="sm-form-select"
                value={formData.crawl_type}
                onChange={(e) => setFormData(prev => ({ ...prev, crawl_type: e.target.value as 'rss' | 'html' }))}
              >
                <option value="rss">RSS 订阅</option>
                <option value="html">网页爬取</option>
              </select>
            </div>
            {formData.crawl_type === 'html' && (
              <>
                <div className="sm-form-group">
                  <label className="sm-form-label">列表选择器</label>
                  <input
                    type="text"
                    className="sm-form-input"
                    placeholder="如：.article-list"
                    value={formData.list_selector}
                    onChange={(e) => setFormData(prev => ({ ...prev, list_selector: e.target.value }))}
                  />
                  <p className="sm-form-hint">CSS 选择器定位文章列表容器</p>
                </div>
                <div className="sm-form-group">
                  <label className="sm-form-label">标题选择器</label>
                  <input
                    type="text"
                    className="sm-form-input"
                    placeholder="如：h3.title a"
                    value={formData.title_selector}
                    onChange={(e) => setFormData(prev => ({ ...prev, title_selector: e.target.value }))}
                  />
                  <p className="sm-form-hint">CSS 选择器定位标题和链接</p>
                </div>
              </>
            )}
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
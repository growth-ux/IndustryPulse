import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import GlobalSearch from './GlobalSearch'
import './Header.css'

export default function Header() {
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="header">
      <Link to="/" className="logo">
        <div className="logo-icon">
          <svg className="icon" viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <span className="logo-text">IndustryPulse</span>
      </Link>
      <button className="global-search-btn" onClick={() => setSearchOpen(true)}>
        <svg className="icon" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span className="search-btn-text">搜索</span>
      </button>
      <nav className="nav-links">
        <Link
          to="/hot"
          className={`nav-link ${location.pathname === '/hot' ? 'active' : ''}`}
        >
          <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
          </svg>
          今日热点
        </Link>
        <Link
          to="/"
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          产业赛道
        </Link>
        <Link
          to="/sources"
          className={`nav-link ${location.pathname === '/sources' ? 'active' : ''}`}
        >
          <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
            <path d="M4 11a9 9 0 0 1 9 9"></path>
            <path d="M4 4a16 16 0 0 1 16 16"></path>
            <circle cx="5" cy="19" r="1"></circle>
          </svg>
          订阅源管理
        </Link>
        <Link
          to="/insights"
          className={`nav-link ${location.pathname === '/insights' ? 'active' : ''}`}
        >
          <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          数据洞察
        </Link>
        <Link
          to="/favorites"
          className={`nav-link ${location.pathname === '/favorites' ? 'active' : ''}`}
        >
          <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          我的收藏
        </Link>
      </nav>
      <div className="user-menu">
        <div className="user-avatar">W</div>
        <span className="user-name">weiyu</span>
      </div>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
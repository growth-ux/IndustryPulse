import { Link, useLocation } from 'react-router-dom'
import './Header.css'

export default function Header() {
  const location = useLocation()

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
      <nav className="nav-links">
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
      </nav>
    </header>
  )
}
import type { TimelineEvent } from '../types'
import './EventCard.css'

interface EventCardProps {
  event: TimelineEvent
}

const TYPE_COLORS: Record<string, string> = {
  policy: 'var(--type-policy)',
  funding: 'var(--type-funding)',
  product: 'var(--type-product)',
  ma: 'var(--type-ma)',
  tech: 'var(--type-tech)',
  report: 'var(--type-report)',
  person: 'var(--type-person)',
  other: '#6B7280',
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <div className="event-card">
      <div className="event-source">
        <span className="source-logo">{event.source_icon}</span>
        <span className="source-name">{event.source}</span>
      </div>

      <h3 className="event-title">
        <a href={event.url} target="_blank" rel="noopener noreferrer">
          {event.title}
        </a>
      </h3>

      <p className="event-summary">{event.summary}</p>

      <div className="ai-commentary">
        <div className="ai-commentary-header">
          <span className="ai-badge">
            <svg className="icon icon-xs" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
              <path d="M12 2a7 7 0 0 1 7 7h-7V2z" fill="currentColor"></path>
            </svg>
            AI 点评
          </span>
        </div>
        <p className="ai-text">{event.ai_commentary}</p>
      </div>

      <div className="event-footer">
        <div className="event-tags">
          <span className="event-tag" style={{ background: TYPE_COLORS[event.type] }}>
            {event.type_name}
          </span>
        </div>
        <a href={event.url} className="event-link" target="_blank" rel="noopener noreferrer">
          阅读原文
          <svg className="icon icon-sm" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </div>
    </div>
  )
}

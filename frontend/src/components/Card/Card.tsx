import type { Card as CardType, Priority } from '../../types/domain'

const PRIORITY_LABEL: Record<Exclude<Priority, null>, string> = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
}

function isOverdue(dueDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return dueDate < today
}

interface CardProps {
  card: CardType
}

export function Card({ card }: CardProps) {
  return (
    <div className="card">
      <p className="card-text">{card.text}</p>
      <div className="card-badges">
        {card.dueDate && (
          <span className={`badge badge-due${isOverdue(card.dueDate) ? ' badge-overdue' : ''}`}>
            📅 {card.dueDate}
          </span>
        )}
        {card.priority && <span className="badge badge-priority">優先度: {PRIORITY_LABEL[card.priority]}</span>}
        {card.comments.length > 0 && (
          <span className="badge badge-comments">💬 {card.comments.length}</span>
        )}
      </div>
    </div>
  )
}

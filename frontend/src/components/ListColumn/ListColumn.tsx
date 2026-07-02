import type { BoardList } from '../../types/domain'
import { Card } from '../Card/Card'

interface ListColumnProps {
  list: BoardList
}

export function ListColumn({ list }: ListColumnProps) {
  return (
    <div className="list-column">
      <h2 className="list-title">{list.title}</h2>
      <div className="list-cards">
        {list.cards.length === 0 ? (
          <p className="list-empty">カードがありません</p>
        ) : (
          list.cards.map((card) => <Card key={card.id} card={card} />)
        )}
      </div>
    </div>
  )
}

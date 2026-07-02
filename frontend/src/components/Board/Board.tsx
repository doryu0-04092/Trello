import { useLists } from '../../hooks/useLists'
import { ListColumn } from '../ListColumn/ListColumn'

export function Board() {
  const { data: lists, isLoading, isError, error } = useLists()

  if (isLoading) {
    return <p className="board-status">読み込み中...</p>
  }

  if (isError) {
    return <p className="board-status board-status-error">データの取得に失敗しました: {(error as Error).message}</p>
  }

  if (!lists || lists.length === 0) {
    return <p className="board-status">リストがありません</p>
  }

  return (
    <div className="board">
      {lists.map((list) => (
        <ListColumn key={list.id} list={list} />
      ))}
    </div>
  )
}

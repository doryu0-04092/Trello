import { apiGet } from './client'
import type { BoardList } from '../types/domain'

export function fetchLists(): Promise<BoardList[]> {
  return apiGet<BoardList[]>('/lists')
}

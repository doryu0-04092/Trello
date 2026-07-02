import { useQuery } from '@tanstack/react-query'
import { fetchLists } from '../api/lists'

export function useLists() {
  return useQuery({
    queryKey: ['lists'],
    queryFn: fetchLists,
  })
}

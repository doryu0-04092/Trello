export type Priority = 'HIGH' | 'MEDIUM' | 'LOW' | null

export interface Comment {
  id: number
  text: string
  createdAt: string
}

export interface Card {
  id: number
  text: string
  dueDate: string | null
  priority: Priority
  displayOrder: number
  comments: Comment[]
}

export interface BoardList {
  id: number
  title: string
  displayOrder: number
  cards: Card[]
}

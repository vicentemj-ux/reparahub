export interface WorkshopMessage {
  id: string
  content: string
  sender_id: string
  sender_name: string
  recipient_id?: string | null
  created_at: string
}

export interface ChatUser {
  id: string
  name: string
}

export interface ChatMember {
  id: string
  name: string
  role: string
  online?: boolean
}

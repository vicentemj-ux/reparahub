import { EmptyState } from "@/components/dashboard/chat/empty-state"
import { MessageBubble } from "@/components/dashboard/chat/message-bubble"
import type { WorkshopMessage } from "@/components/dashboard/chat/types"

interface MessageListProps {
  loading: boolean
  messages: WorkshopMessage[]
  isOwnMessage: (message: WorkshopMessage) => boolean
}

export function MessageList({ loading, messages, isOwnMessage }: MessageListProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Cargando mensajes del taller...
      </div>
    )
  }

  if (!messages.length) {
    return <EmptyState />
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-2 py-2 sm:px-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} mine={isOwnMessage(message)} />
      ))}
    </div>
  )
}

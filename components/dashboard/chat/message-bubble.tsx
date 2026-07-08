import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { WorkshopMessage } from "@/components/dashboard/chat/types"

interface MessageBubbleProps {
  message: WorkshopMessage
  mine: boolean
}

export function MessageBubble({ message, mine }: MessageBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const initial = (mine ? "TU" : message.sender_name.slice(0, 1) || "T").toUpperCase()

  return (
    <div className={cn("mb-4 flex w-full items-end gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine ? (
        <Avatar className="h-8 w-8 border border-slate-200">
          <AvatarFallback className="bg-slate-100 text-[11px] font-bold text-slate-600">{initial}</AvatarFallback>
        </Avatar>
      ) : null}

      <div className={cn("max-w-[85%] sm:max-w-[72%]", mine ? "items-end" : "items-start")}>
        <div className="mb-1 flex items-center gap-2 px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {mine ? "Tu" : message.sender_name}
          </p>
          <span className="text-[10px] text-slate-400">{time}</span>
        </div>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
            mine
              ? "rounded-br-md bg-blue-600 text-white"
              : "rounded-bl-md border border-slate-200 bg-white text-slate-800",
          )}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        </div>
      </div>
    </div>
  )
}

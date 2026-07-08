import { MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ChatHeaderProps {
  currentUserName?: string
  modeLabel?: string
}

export function ChatHeader({ currentUserName, modeLabel }: ChatHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2.5 sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 sm:h-11 sm:w-11">
            <MessageCircle className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Chat Taller PRO</p>
            <h2 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-xl">
              {modeLabel || "Canal general del taller"}
            </h2>
            <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
              Comunicacion interna para coordinar el trabajo del equipo
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {currentUserName ? (
            <Badge className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] sm:text-xs">
              <span className="hidden sm:inline">{currentUserName}</span>
              <span className="sm:hidden">
                {currentUserName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  )
}

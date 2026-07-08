import { MessageCircle, RadioTower, UsersRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { ChatMember } from "@/components/dashboard/chat/types"

interface ChatSidebarProps {
  members: ChatMember[]
  activePeerId: string | null
  onSelectGeneral: () => void
  onSelectPrivate: (member: ChatMember) => void
}

export function ChatSidebar({ members, activePeerId, onSelectGeneral, onSelectPrivate }: ChatSidebarProps) {
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:w-[300px]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
          <MessageCircle className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-xl font-black italic tracking-tight text-slate-900">CHAT TALLER</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Workspace activo</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelectGeneral}
        className="w-full rounded-2xl bg-blue-600 p-3 text-white shadow-sm"
      >
        <div className="flex items-center gap-2 text-left">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/80">
            <RadioTower className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]">Canal activo</p>
            <p className="text-sm font-extrabold">Canal general</p>
          </div>
        </div>
      </button>

      <div className="my-5 h-px bg-slate-100" />

      <div>
        <div className="mb-3 flex items-center gap-2 text-slate-500">
          <UsersRound className="h-4 w-4" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Miembros del taller</p>
        </div>
        <div className="space-y-2">
          {members.map((member) => (
            <button
              type="button"
              key={member.id}
              onClick={() => onSelectPrivate(member)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left",
                activePeerId === member.id
                  ? "border-blue-200 bg-blue-50/80"
                  : "border-slate-100 bg-slate-50/70 hover:bg-slate-100",
              )}
            >
              <div className="relative">
                <Avatar className="h-9 w-9 border border-slate-200">
                  <AvatarFallback className="bg-white text-xs font-bold text-slate-700">
                    {member.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                    member.online ? "bg-emerald-500" : "bg-slate-300",
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{member.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{member.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

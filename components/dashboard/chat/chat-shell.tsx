import type { ReactNode } from "react"

interface ChatShellProps {
  sidebar: ReactNode
  header: ReactNode
  messages: ReactNode
  input: ReactNode
  footer?: ReactNode
  /** Vista activa en mobile. En desktop siempre se muestran ambos paneles. */
  mobileView: "list" | "chat"
  onBack: () => void
}

export function ChatShell({ sidebar, header, messages, input, footer, mobileView, onBack }: ChatShellProps) {
  return (
    <section className="grid h-full min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[300px_minmax(0,1fr)] lg:border-0 lg:bg-transparent lg:shadow-none">
      {/* Sidebar (canales + miembros) - mobile: solo en vista 'list' */}
      <div
        className={`min-h-0 ${mobileView === "chat" ? "hidden" : "block"} lg:block`}
        aria-hidden={mobileView === "chat"}
      >
        {sidebar}
      </div>

      {/* Conversacion - mobile: solo en vista 'chat' */}
      <div
        className={`min-h-0 ${mobileView === "list" ? "hidden" : "flex"} lg:flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}
      >
        {/* Toolbar mobile-only con boton atras (WhatsApp/Telegram pattern) */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-1 py-1 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200"
            aria-label="Volver a la lista de canales"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Canales
          </span>
        </div>

        {header}
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/45 px-1 py-2 sm:px-2">{messages}</div>
        {input}
        {footer ? <div className="bg-white px-4 pb-3 text-center">{footer}</div> : null}
      </div>
    </section>
  )
}

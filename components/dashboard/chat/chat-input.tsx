import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { RefObject } from "react"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  inputRef: RefObject<HTMLInputElement | null>
}

export function ChatInput({ value, onChange, onSend, inputRef }: ChatInputProps) {
  return (
    <div
      className="border-t border-slate-200 bg-slate-50/70 px-2.5 py-2 sm:px-5 sm:py-4"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <form
        className="mx-auto flex w-full max-w-4xl items-center gap-1.5 sm:gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSend()
        }}
      >
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Escribe un mensaje..."
          className="h-11 flex-1 rounded-full border-slate-200 bg-white text-sm shadow-sm placeholder:text-slate-400 sm:h-14 sm:text-base"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim()}
          className="btn-glow h-10 w-10 shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700 sm:h-12 sm:w-12"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </Button>
      </form>
    </div>
  )
}

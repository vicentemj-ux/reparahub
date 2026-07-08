"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, Search } from "lucide-react"

interface ClientsSearchFilterProps {
  onSearch: (query: string) => void
  isLoading?: boolean
}

export function ClientsSearchFilter({ onSearch, isLoading = false }: ClientsSearchFilterProps) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    const trimmed = query.trim()
    const onlyDigits = trimmed.replace(/\D/g, "")
    const isPhoneSearch = trimmed.length > 0 && onlyDigits.length === trimmed.length
    const meetsMinLength = trimmed.length === 0 || (isPhoneSearch ? onlyDigits.length >= 4 : trimmed.length >= 2)

    if (!meetsMinLength) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      onSearch(trimmed)
    }, 320)

    return () => window.clearTimeout(timer)
  }, [query, onSearch])

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <Input
        placeholder="Buscar por nombre, telefono o ID..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 border-0 bg-transparent pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-0"
      />
      {isLoading ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
      ) : null}
    </div>
  )
}

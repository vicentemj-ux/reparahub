"use client"

import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import type { TallerSettings } from "@/lib/actions/settings-prisma"

interface FieldWrapProps {
  field: keyof TallerSettings
  label: string
  errors: Record<string, string>
  children: React.ReactNode
}

export function FieldWrap({ field, label, errors, children }: FieldWrapProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold tracking-wide text-slate-600">{label}</Label>
      {children}
      {errors[field] && (
        <p className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {errors[field]}
        </p>
      )}
    </div>
  )
}

"use client"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface ModuleHeaderStat {
  label: string
  value: ReactNode
  tone?: "slate" | "blue" | "emerald" | "amber" | "red"
}

interface ModuleHeaderProps {
  icon: LucideIcon
  title: string
  eyebrow: string
  description: string
  badge?: ReactNode
  stats?: ModuleHeaderStat[]
  actions?: ReactNode
  className?: string
}

const statToneClass: Record<NonNullable<ModuleHeaderStat["tone"]>, string> = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
}

export function ModuleHeader({
  icon: Icon,
  title,
  eyebrow,
  description,
  badge,
  stats,
  actions,
  className,
}: ModuleHeaderProps) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
            <Icon className="h-6 w-6 text-blue-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-extrabold italic tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              {badge ? (
                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-sm font-bold text-slate-600">
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="text-[10px] font-semibold tracking-widest text-slate-500">
              {eyebrow}
            </p>
            <p className="mt-1 hidden text-sm tracking-tight text-slate-500 sm:block">
              {description}
            </p>
          </div>
        </div>

        {(stats?.length || actions) ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {stats?.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "rounded-2xl px-4 py-2 text-center",
                  statToneClass[stat.tone ?? "slate"],
                )}
              >
                <div className="text-lg font-black leading-none tabular-nums">{stat.value}</div>
                <div className="mt-1 text-[9px] font-black uppercase tracking-wider opacity-70">
                  {stat.label}
                </div>
              </div>
            ))}
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  )
}

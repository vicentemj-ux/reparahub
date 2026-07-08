"use client"

import type { DocumentType } from "@/lib/print/demo-data"
import { DOCUMENT_TYPES } from "./imprenta-types"

interface ImprentaDocumentSelectorProps {
  selected: DocumentType
  onSelect: (type: DocumentType) => void
}

export function ImprentaDocumentSelector({
  selected,
  onSelect,
}: ImprentaDocumentSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {DOCUMENT_TYPES.map((doc) => {
        const Icon = doc.icon
        const isActive = selected === doc.id
        return (
          <button
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition-all ${
              isActive
                ? "border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-600"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  isActive ? "text-blue-700" : "text-slate-700"
                }`}
              >
                {doc.label}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                {doc.description}
              </p>
            </div>
            {isActive && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600" />
            )}
          </button>
        )
      })}
    </div>
  )
}

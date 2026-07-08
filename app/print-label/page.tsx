"use client"

import { useEffect, useState, useRef } from "react"
import {
  RepairOrderLabel,
  RepairOrderLabelPro,
  AccessoryLabel,
  DeviceInventoryLabel,
  type RepairOrderLabelData,
  type RepairOrderLabelProData,
  type AccessoryLabelData,
  type DeviceInventoryLabelData,
} from "@/components/printing"
import { ProductSaleLabelTemplate, type ProductSaleLabelTemplateData } from "@/components/printing"
import { VentaLabel, type VentaLabelData } from "@/components/printing"
import { usePrintWindowClose } from "@/hooks/use-print-window-close"
import { getTallerSettings } from "@/lib/actions/settings-prisma"

type AccessoryLabelWithKind = AccessoryLabelData & { kind: "accessory-label" }
type DeviceInventoryLabelWithKind = DeviceInventoryLabelData & { kind: "device-inventory-label" }

type AnyLabelData =
  | RepairOrderLabelData
  | RepairOrderLabelProData
  | ProductSaleLabelTemplateData
  | AccessoryLabelWithKind
  | DeviceInventoryLabelWithKind
  | VentaLabelData

type LabelKind = "venta-label" | "product-sale-label" | "accessory-label" | "device-inventory-label" | "repair-label-pro" | "repair"

function getCookieValue(name: string): string {
  if (typeof document === "undefined") return ""
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1]

  if (!cookie) return ""

  try {
    return decodeURIComponent(cookie).trim()
  } catch {
    return cookie.trim()
  }
}

async function hydrateLabelFallbacks(d: AnyLabelData): Promise<AnyLabelData> {
  if (getKind(d) !== "repair-label-pro") return d

  const labelData = d as RepairOrderLabelProData
  if (labelData.shopName?.trim()) return d

  const tallerName = getCookieValue("tallerName")
  if (tallerName) {
    return {
      ...labelData,
      shopName: tallerName,
    }
  }

  const { settings } = await getTallerSettings()
  const settingsName = settings?.nombre_taller?.trim()
  if (!settingsName) return d

  return {
    ...labelData,
    shopName: settingsName,
  }
}

function getKind(d: AnyLabelData): LabelKind {
  const k = (d as { kind?: string }).kind
  if (k === "venta-label") return "venta-label"
  if (k === "product-sale-label") return "product-sale-label"
  if (k === "accessory-label") return "accessory-label"
  if (k === "device-inventory-label") return "device-inventory-label"
  if (k === "repair-label-pro") return "repair-label-pro"
  return "repair"
}

export default function PrintLabelStandalonePage() {
  const [data, setData] = useState<AnyLabelData | null>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  usePrintWindowClose()

  useEffect(() => {
    const stored = window.localStorage.getItem("printLabel")
    if (!stored) {
      window.close()
      return
    }

    let cancelled = false
    let id: number | null = null

    async function prepareAndPrint() {
      const parsed = JSON.parse(stored!) as AnyLabelData
      const hydrated = await hydrateLabelFallbacks(parsed)
      if (cancelled) return

      setData(hydrated)
      document.body.classList.add("print-label-mode")

      const style = document.createElement("style")
      style.id = "label-page-style"
      style.textContent = `
        @page { size: 50.8mm 25.4mm; margin: 0; padding: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          body { background: #ffffff !important; }
        }
      `
      document.head.appendChild(style)

      id = window.setTimeout(() => {
        window.print()
      }, 500)
    }

    void prepareAndPrint()

    return () => {
      cancelled = true
      if (id) window.clearTimeout(id)
      document.body.classList.remove("print-label-mode")
      document.getElementById("label-page-style")?.remove()
    }
  }, [])

  if (!data) return null

  const kind = getKind(data)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-black print:min-h-0 print:bg-white print:p-0">
      {kind === "venta-label" ? (
        <VentaLabel ref={labelRef} data={data as VentaLabelData} />
      ) : kind === "product-sale-label" ? (
        <ProductSaleLabelTemplate ref={labelRef} data={data as ProductSaleLabelTemplateData} />
      ) : kind === "accessory-label" ? (
        <AccessoryLabel ref={labelRef} data={data as AccessoryLabelWithKind} />
      ) : kind === "device-inventory-label" ? (
        <DeviceInventoryLabel ref={labelRef} data={data as DeviceInventoryLabelWithKind} />
      ) : kind === "repair-label-pro" ? (
        <RepairOrderLabelPro ref={labelRef} data={data as RepairOrderLabelProData} />
      ) : (
        <RepairOrderLabel ref={labelRef} data={data as RepairOrderLabelData} />
      )}
    </div>
  )
}

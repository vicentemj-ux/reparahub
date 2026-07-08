import type { LucideIcon } from "lucide-react"
import {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Cpu,
  HardDrive,
  Battery,
  Cable,
  Headphones,
  Camera,
  Watch,
  Gamepad2,
  Printer,
  Wrench,
  Truck,
  Package,
  Tag,
  Shirt,
  Book,
  Zap,
  Heart,
  Settings,
  MoreHorizontal,
} from "lucide-react"

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Cpu,
  HardDrive,
  Battery,
  Cable,
  Headphones,
  Camera,
  Watch,
  Gamepad2,
  Printer,
  Wrench,
  Truck,
  Package,
  Tag,
  Shirt,
  Book,
  Zap,
  Heart,
  Settings,
  MoreHorizontal,
}

export function getCategoryIcon(icono: string | null | undefined): LucideIcon {
  if (icono && CATEGORY_ICON_MAP[icono]) return CATEGORY_ICON_MAP[icono]
  return Tag
}

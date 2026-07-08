export const DEFAULT_REPAIR_BRANDS = ["Apple", "Samsung", "Xiaomi", "Motorola", "Huawei", "Lenovo", "HP", "Dell", "ASUS", "Sony"]

export const REPAIR_BRANDS_BY_DEVICE_TYPE: Record<string, string[]> = {
  Celular: [
    "Apple",
    "Samsung",
    "Xiaomi",
    "Motorola",
    "Huawei",
    "OPPO",
    "Honor",
    "vivo",
    "realme",
    "Google",
    "Nokia",
    "ZTE",
    "TCL",
  ],
  Tablet: [
    "Apple",
    "Samsung",
    "Lenovo",
    "Huawei",
    "Xiaomi",
    "Amazon",
    "Microsoft",
    "Honor",
    "TCL",
    "Alcatel",
  ],
  Laptop: [
    "HP",
    "Dell",
    "Lenovo",
    "ASUS",
    "Acer",
    "Apple",
    "MSI",
    "Huawei",
    "Samsung",
    "Microsoft",
    "Toshiba",
    "Gateway",
  ],
  Computadora: [
    "HP",
    "Dell",
    "Lenovo",
    "ASUS",
    "Acer",
    "Apple",
    "MSI",
    "Gigabyte",
    "Intel",
    "CyberPowerPC",
  ],
  Videojuego: [
    "Sony",
    "Microsoft",
    "Nintendo",
    "Valve",
    "ASUS",
    "Lenovo",
    "Sega",
  ],
  Impresora: [
    "Epson",
    "HP",
    "Canon",
    "Brother",
    "Samsung",
    "Xerox",
    "Lexmark",
    "Kyocera",
    "Ricoh",
    "Zebra",
  ],
  Reloj: [
    "Apple",
    "Samsung",
    "Huawei",
    "Xiaomi",
    "Garmin",
    "Amazfit",
    "Fitbit",
    "Honor",
    "Fossil",
  ],
  Proyector: [
    "Epson",
    "BenQ",
    "ViewSonic",
    "LG",
    "Sony",
    "Optoma",
    "Acer",
    "Hisense",
    "XGIMI",
  ],
  Otro: DEFAULT_REPAIR_BRANDS,
}

export function normalizeRepairDeviceType(value: string) {
  const v = (value || "").trim().toLowerCase()
  if (v.includes("smartphone") || v.includes("cel")) return "Celular"
  if (v.includes("tablet")) return "Tablet"
  if (v.includes("laptop") || v.includes("notebook")) return "Laptop"
  if (v.includes("desktop") || v.includes("computadora") || v.includes("pc")) return "Computadora"
  if (v.includes("video") || v.includes("consola") || v.includes("playstation") || v.includes("xbox") || v.includes("nintendo")) return "Videojuego"
  if (v.includes("impresora") || v.includes("printer")) return "Impresora"
  if (v.includes("reloj") || v.includes("watch")) return "Reloj"
  if (v.includes("proyector")) return "Proyector"
  return "Otro"
}

export function getRecommendedRepairBrands(deviceType: string) {
  const normalized = normalizeRepairDeviceType(deviceType)
  return REPAIR_BRANDS_BY_DEVICE_TYPE[normalized] ?? DEFAULT_REPAIR_BRANDS
}

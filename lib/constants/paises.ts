export interface PaisInfo {
  nombre: string
  codigoTelefono: string
}

export const PAISES: PaisInfo[] = [
  { nombre: "Mexico", codigoTelefono: "52" },
  { nombre: "Argentina", codigoTelefono: "54" },
  { nombre: "Bolivia", codigoTelefono: "591" },
  { nombre: "Chile", codigoTelefono: "56" },
  { nombre: "Colombia", codigoTelefono: "57" },
  { nombre: "Costa Rica", codigoTelefono: "506" },
  { nombre: "Cuba", codigoTelefono: "53" },
  { nombre: "Ecuador", codigoTelefono: "593" },
  { nombre: "El Salvador", codigoTelefono: "503" },
  { nombre: "Estados Unidos", codigoTelefono: "1" },
  { nombre: "Guatemala", codigoTelefono: "502" },
  { nombre: "Honduras", codigoTelefono: "504" },
  { nombre: "Nicaragua", codigoTelefono: "505" },
  { nombre: "Panama", codigoTelefono: "507" },
  { nombre: "Paraguay", codigoTelefono: "595" },
  { nombre: "Peru", codigoTelefono: "51" },
  { nombre: "Puerto Rico", codigoTelefono: "1" },
  { nombre: "Republica Dominicana", codigoTelefono: "1" },
  { nombre: "Uruguay", codigoTelefono: "598" },
  { nombre: "Venezuela", codigoTelefono: "58" },
  { nombre: "Espana", codigoTelefono: "34" },
]

export function getCodigoTelefono(paisNombre: string | null | undefined): string | null {
  if (!paisNombre) return null
  const p = PAISES.find((p) => p.nombre === paisNombre)
  return p?.codigoTelefono ?? null
}

export const ESTADOS_MEXICO = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
  "Chiapas", "Chihuahua", "Ciudad de Mexico", "Coahuila", "Colima",
  "Durango", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Mexico",
  "Michoacan", "Morelos", "Nayarit", "Nuevo Leon", "Oaxaca", "Puebla",
  "Queretaro", "Quintana Roo", "San Luis Potosi", "Sinaloa", "Sonora",
  "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatan", "Zacatecas",
]

export function getPaisesNombres(): string[] {
  return PAISES.map((p) => p.nombre)
}

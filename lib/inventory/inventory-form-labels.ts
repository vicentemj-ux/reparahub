/**
 * Etiquetas neutras / dinamicas segun categoria (sin amarrar a marcas comerciales).
 */
export function getInventoryFieldLabels(categoria: string) {
  const cat = (categoria || "").trim().toUpperCase()

  if (cat === "EQUIPOS") {
    return {
      marca: "Marca",
      modelo: "Modelo",
      condicion: "Condicion del equipo",
      ubicacion: "Ubicacion en almacen",
      procesador: "Procesador / SoC",
      ram: "Memoria RAM",
      almacenamiento: "Almacenamiento",
      color: "Color / acabado",
    }
  }

  if (cat === "REFACCIONES" || cat === "PANTALLAS" || cat === "BATERIAS") {
    return {
      marca: "Marca compatible",
      modelo: "Referencia / modelo",
      condicion: "Condicion",
      ubicacion: "Ubicacion en almacen",
      procesador: "Especificacion principal",
      ram: "Detalle adicional",
      almacenamiento: "Capacidad / tamano",
      color: "Color",
    }
  }

  return {
    marca: "Marca / fabricante",
    modelo: "Modelo o referencia",
    condicion: "Condicion",
    ubicacion: "Ubicacion en almacen",
    procesador: "Especificacion 1",
    ram: "Especificacion 2",
    almacenamiento: "Especificacion 3",
    color: "Color / variante",
  }
}

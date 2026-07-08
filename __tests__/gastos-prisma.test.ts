import { describe, expect, it } from "vitest"
import { shouldAplicarGastoACaja } from "@/lib/gastos/gasto-caja"

describe("shouldAplicarGastoACaja", () => {
  it("aplica solo cuando es efectivo, hay caja y la opcion sigue activa", () => {
    expect(shouldAplicarGastoACaja("efectivo", "caja-1", true)).toBe(true)
  })

  it("permite continuar sin salida de caja cuando la opcion se desactiva", () => {
    expect(shouldAplicarGastoACaja("efectivo", "caja-1", false)).toBe(false)
  })

  it("no aplica a caja cuando no hay caja abierta", () => {
    expect(shouldAplicarGastoACaja("efectivo", null, true)).toBe(false)
  })

  it("no aplica a caja para metodos no efectivos", () => {
    expect(shouldAplicarGastoACaja("tarjeta", "caja-1", true)).toBe(false)
  })
})

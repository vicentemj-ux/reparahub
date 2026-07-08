export function shouldAplicarGastoACaja(
  metodoPago: string,
  cajaAbiertaId: string | null,
  aplicarACaja = true,
): boolean {
  const metodo = metodoPago.toLowerCase()
  return metodo === "efectivo" && Boolean(cajaAbiertaId) && aplicarACaja
}

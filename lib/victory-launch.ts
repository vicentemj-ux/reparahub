/**
 * Confeti + sonido al registrar un ticket con exito.
 * Sonido: coloca un MP3 corto en `public/sounds/shutter.mp3` (obturador).
 */
export async function triggerVictoryLaunch(): Promise<void> {
  if (typeof window === "undefined") return
  try {
    const { default: confetti } = await import("canvas-confetti")
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
  } catch {
    /* canvas-confetti opcional si falla la carga */
  }
  try {
    // public/sounds/shutter.mp3 - anade el archivo para el clic de obturador
    const audio = new Audio("/sounds/shutter.mp3")
    await audio.play()
  } catch {
    /* Sin archivo, autoplay bloqueado o formato no soportado */
  }
}

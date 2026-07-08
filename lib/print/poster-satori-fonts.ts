/**
 * Tipos para fuentes pasadas a Satori (la carga real vive en `app/api/generate-poster/route.ts`
 * para usar URL publica + fallback a `public/fonts/` sin depender de node_modules).
 */
export type SatoriFont = {
  name: string
  data: ArrayBuffer
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  style: "normal" | "italic"
}

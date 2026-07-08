/** @type {import('next').NextConfig} */

// Legacy Supabase host is optional. S3-compatible storage is canonical; R2 remains a legacy image fallback.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseHost = supabaseUrl.replace(/^https?:\/\//, "").split("/")[0] || ""
const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL || ""
const r2PublicHost = r2PublicBaseUrl.replace(/^https?:\/\//, "").split("/")[0] || ""
const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL || ""
const s3PublicHost = s3PublicBaseUrl.replace(/^https?:\/\//, "").split("/")[0] || ""
const legacySupabaseImgSrc = supabaseHost ? ` https://${supabaseHost} https://*.supabase.co` : ""
const legacySupabaseConnectSrc = supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""

// Content Security Policy
// 'unsafe-inline' requerido por Next.js App Router (scripts de bootstrap/hidratacion).
// Nonce/hash no es viable porque Next.js no soporta nonces en sus scripts inline del App Router.
//
// 'unsafe-eval': necesario en desarrollo para React Fast Refresh.
// En produccion se omite por defecto (seguridad). Si al generar PDFs, tickets
// o reportes observas errores de CSP en consola, activa la variable de entorno:
//
//   CSP_ALLOW_UNSAFE_EVAL=true
//
// Sin necesidad de tocar codigo ni redeployar con cambios de configuracion.
const unsafeEval = process.env.CSP_ALLOW_UNSAFE_EVAL === 'true' || process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ""

const csp = [
  "default-src 'self'",
  "object-src 'none'",
  `script-src 'self' ${unsafeEval} 'unsafe-inline' blob: https://cdn.jsdelivr.net`.replace(/\s+/g, ' ').trim(),
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' blob: data:${legacySupabaseImgSrc}${s3PublicHost ? ` https://${s3PublicHost}` : ""}${r2PublicHost ? ` https://${r2PublicHost} https://*.r2.dev` : " https://*.r2.dev"}`,
  "font-src 'self' https://fonts.gstatic.com",
  // ReparaHub Print Daemon (instalacion local por tenant).
  // El panel de Configuracion > Imprenta hace fetch() y WebSocket a 127.0.0.1:8182
  // para detectar el daemon y enviar trabajos de impresion directa. Sin estos
  // origines en connect-src, la CSP bloquea la peticion con
  // `blockedReason: "csp"` y el panel muestra "Failed to fetch" aunque el
  // CORS del daemon este bien configurado.
  `connect-src 'self'${legacySupabaseConnectSrc} https://cdn.jsdelivr.net http://127.0.0.1:8182 http://localhost:8182 ws://127.0.0.1:8182 ws://localhost:8182`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: csp },
]

const nextConfig = {
  /** Requerido para build desktop (Tauri). Genera .next/standalone/ */
  output: 'standalone',
  /** Binarios nativos (napi-rs) + pg (util/types no disponible en bundler): no empaquetar con Turbopack. */
  serverExternalPackages: ["@resvg/resvg-js", "pg"],
  typescript: {
    // ignoreBuildErrors eliminado como parte de la auditoria de seguridad.
    // Todos los errores de TypeScript deben corregirse antes de deploy.
  },
  // Bundle optimization for Lighthouse score
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    // Optimized for Lighthouse score - enable Next.js image optimization in production
    // In dev, we keep unoptimized for faster HMR; in prod, we optimize
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https",
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
            {
              protocol: "https",
              hostname: supabaseHost,
              pathname: "/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
        pathname: "/**",
      },
      ...(s3PublicHost
        ? [
            {
              protocol: "https",
              hostname: s3PublicHost,
              pathname: "/**",
            },
          ]
        : []),
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return [
      {
        source: "/tracking/:id",
        destination: "/track/:id",
        permanent: true,
      },
    ]
  },
}

export default nextConfig

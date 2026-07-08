import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const inter = Inter({ subsets: ["latin"], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'ReparaHub - Software para talleres de reparación',
    template: '%s | ReparaHub',
  },
  description: 'Gestiona reparaciones, punto de venta, inventario, apartados y cotizaciones desde cualquier dispositivo.',
  metadataBase: new URL('https://reparahub.com'),
  keywords: ['software para talleres', 'reparación de celulares', 'punto de venta', 'inventario', 'apartados', 'cotizaciones'],
  authors: [{ name: 'Vicente Munguia' }],
  creator: 'Vicente Munguia',
  publisher: 'ReparaHub',
  applicationName: 'ReparaHub',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://reparahub.com',
    siteName: 'ReparaHub',
    title: 'ReparaHub - Software para talleres de reparación',
    description: 'Reparaciones, POS, inventario, apartados y cotizaciones desde una sola plataforma.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'ReparaHub, software para talleres de reparación' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReparaHub',
    description: 'Reparaciones, POS, inventario, apartados y cotizaciones para talleres.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    icon: [
      {
        url: '/icon.webp',
        type: 'image/webp',
      },
      {
        url: '/pwa-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#155EEF',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es-MX" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="/logo.webp" as="image" type="image/webp" fetchPriority="high" />
      </head>
      <body className={`${inter.className} font-sans antialiased`} suppressHydrationWarning={true}>
        {children}
        <PwaRegister />
        <Toaster />
      </body>
    </html>
  )
}

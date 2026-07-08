# Compliance: Tiendas Publicas (Mi Tienda)

Documento interno sobre cumplimiento legal aplicable a las tiendas publicas de cada tenant en `/t/<slug>`. Cubre Mexico y lineamientos LATAM.

## 1. Relacion ReparaHub <-> Tenant

**ReparaHub es un proveedor de plataforma (SaaS).** No somos el vendedor, ni el responsable del inventario, ni del cumplimiento de la transaccion comercial. El tenant (taller) es responsable de:

- Informacion veraz de productos (nombre, descripcion, precio, disponibilidad).
- Cumplimiento de garantias y devoluciones.
- Emision de comprobantes fiscales si aplica.
- Atencion al cliente (WhatsApp u otros canales).

ReparaHub provee:
- Hosting y CDN.
- Catalogo publico renderizado en `/t/<slug>`.
- Sin procesamiento de pagos (no hay checkout en MVP).
- Sin cobro de comisiones.

## 2. Disclaimer obligatorio

Cada tienda publica muestra (en footer o bloque visible) el texto:

> Esta tienda es administrada por **{nombre del taller}**. ReparaHub solo provee la plataforma.

Implementacion: header sticky + footer fijo (`components/public/tienda-public-header.tsx` y `tienda-public-footer.tsx`) en TODAS las tiendas publicas, para todos los planes (NORMAL/PRO/Trial). La marca de agua es agresiva por decision comercial (v2.3.x): convierte cada visita en lead para `reparahub.net`. NO hay toggle para ocultarla.

## 3. Privacidad y datos personales (Mexico: LFPDPPP; LATAM: GDPR local)

### Recoleccion
- **No usamos cookies invasivas** en la tienda publica.
- Solo registramos un `TiendaEvento` con `tipo`, `referrer`, `userAgent` (los primeros 500 chars truncados) e IP derivada del `x-forwarded-for` (no almacenada en `TiendaEvento`).
- Sin PII directa: no pedimos nombre, email, telefono en la visita.

### Widget de WhatsApp
- El boton "Pedir por WhatsApp" abre un enlace a `https://api.whatsapp.com/send?phone=...` con un mensaje precargado.
- La conversacion ocurre en WhatsApp, fuera de ReparaHub. La politica de privacidad de Meta aplica una vez el usuario redirige.

### Compliance
- Si el tenant configura `redes.whatsapp`, debe tener el consentimiento del dueno del numero.
- No scrappeamos ni almacenamos contenido de las conversaciones de WhatsApp.

## 4. Propiedad intelectual

- El tenant es dueno del contenido que sube: fotos, descripciones, slogans.
- ReparaHub no reclama derechos sobre las imagenes.
- Si un tercero reclama infraccion (DMCA o equivalente local), se puede:
  1. Desactivar `Tenant.tiendaPublicaActiva` en minutos.
  2. Retirar el producto especifico (`Producto.publicadoEnTienda = false`).
- El bucket R2 donde se almacenan las imagenes esta aislado por tenant logicamente (prefijo `{tallerId}/`).

## 5. Impuestos y facturacion

- El tenant define el precio. ReparaHub no retiene ni cobra impuestos.
- El tenant es responsable de facturar al cliente final si Mexico lo requiere (CFDI 4.0).
- Las transacciones cerradas via WhatsApp no pasan por ReparaHub, por lo que no intervenimos en su trazabilidad fiscal.

## 6. Edad minima y contenido restringido

- El publico objetivo son clientes adultos de talleres (refacciones, reparaciones).
- No se permite contenido para menores.
- ReparaHub puede retirar tiendas que violen ToS.

## 7. Derecho de baja

- Cada tenant puede desactivar su tienda en cualquier momento desde `Mi Tienda > switch "Activa"`.
- Al desactivar, `/t/<slug>` retorna 404 a los visitantes en menos de 1 minuto (cache de Vercel puede tardar mas).
- Los `TiendaEvento` historicos se conservan por 12 meses para analitica del tenant, despues se purgan.

## 8. Sanciones y abuso

- **Rate limit**: 60 req/min por IP (header `X-RateLimit-Limit`). Suficiente para evitar scrapers casuales.
- **Spam**: si un tenant sube contenido ilegal o de terceros, se suspende sin aviso.
- **Robots.txt**: `/t/*` esta permitido para indexacion. `/dashboard/*`, `/api/*`, `/admin/*` y `/auth/*` bloqueados.
- **Sitemap**: solo se incluyen tiendas con `tiendaPublicaActiva = true` y sus productos publicados.

## 9. Cambios en este documento

Cualquier cambio material (nuevos data points, nuevo widget, integracion con pasarela) requiere revision legal y bump MINOR de la version (politica de SemVer del proyecto). Cambios menores (typos, clarificaciones) pueden ir en PATCH.

---

Ultima revision: 2026-06-03 (release v2.3.0).

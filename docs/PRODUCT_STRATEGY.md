# ReparaHub Product Strategy

> Persistent product context for Codex and future implementation work.
> Last updated: 2026-05-21.

## Product Definition

ReparaHub is a multi-tenant SaaS for repair shops and related retail businesses. The initial commercial focus is Mexico, but the product must support other LATAM countries from the core SaaS layer.

Target businesses:

- Cell phone repair shops.
- Computer repair shops.
- Video game console repair shops.
- Electronics repair shops.
- Related parts, accessories, and service stores.

Current public site:

- `reparahub.net` is public.
- Free registration is enabled.
- New accounts receive a 30-day trial.
- Uruguay users have already validated the product and requested WhatsApp country-code support.

## Commercial Model

ReparaHub should launch with two subscription plans:

- Normal.
- Pro.

The 30-day free trial should behave as full Pro access. The goal is for users to test the complete product, understand the value, and decide which plan fits their business before paying.

Plan philosophy:

- Normal is not a crippled product. It should cover the complete core operation for a small shop.
- Pro is for automation, scale, control, advanced reporting, and premium capabilities.

## Plan Direction

### Normal

Recommended scope:

- Repairs / service orders.
- Customers.
- Products and basic inventory.
- POS / sales.
- Cash register basics.
- Web printing through the existing iframe flow.
- Basic dashboard.
- Essential WhatsApp notifications.
- One primary shop / tenant.
- Limited users.
- Standard support.

### Pro

Recommended scope:

- Everything in Normal.
- More users and/or advanced roles.
- Advanced reports.
- Deeper metrics and operational history.
- More complete WhatsApp automations.
- Customizable notification templates.
- Pro repair workflow features.
- Stronger offline/sync workflows where applicable.
- Advanced configuration.
- Priority support.
- Hardware/Tauri integration only when offered for controlled environments.

## Product Modules

### Core / General SaaS Modules

- **Vista General**: main dashboard/home after login. Shows the operating overview for the shop.
- **Mi Suscripcion**: subscription status page. Shows current membership state and upsell/education for the remaining product capabilities.
- **Ventas (POS)**: broad point-of-sale module. Handles sales, payment flows, cash register impact, and daily selling operations.
- **Reparaciones**: the most-used workshop module. Manages repair/service folios and the full operational lifecycle of a repair.
- **Historial de Ventas**: shows POS charges/sales already completed.
- **Inventario**: product management for sellable inventory, including accessories and devices/equipment.
- **Clientes**: customer management for registered clients.
- **Bitacora de Gastos**: operational expenses and cash-affecting outflows.
- **Mi Equipo**: manages teammates/users inside the same account.
- **Configuracion**: business settings, hardware settings, and broader account/shop configuration.

### Pro Modules

- **Bitacora de Visitas**: Pro module in development. Captures every customer visit when they enter the shop. Users must efficiently record the visit reason. Intended control: prevent daily cash closing until the day's visit log is 100% complete.
- **Chat Taller**: Pro module not yet developed. Persistent internal communication for the shop team.
- **Compras**: Pro module for formal purchases, such as online orders or invoiced purchases that affect inventory.
- **Control de Utilidad**: Pro financial reporting page focused on profitability and financial visibility.
- **Mi Tienda** (formerly Mercado): released in v2.3.0. Public catalog per tenant at `/t/<tenant.slug>`. Each tenant publishes a subset of its inventory; visitors can view and reach the shop via WhatsApp. Limits per plan: NORMAL = 5 productos, PRO = 50, Trial = 50 (full PRO during trial). No commission, no checkout. NORMAL tenants display a "Hecho con ReparaHub" watermark (footer + sidebar card); PRO can hide it. Internal marketplace between tenants is NOT planned for the MVP.
- **Reportes**: Pro operational reporting page.
- **Servicios**: Pro module for creating common service templates so frequent services can be added faster in workflows like repairs or POS.

## Trial Rules

- Trial length: 30 days.
- Trial capability level: full Pro access.
- UI should clearly show the current trial state and expiration date.
- Subscription screens should explain what the user keeps or loses when choosing Normal vs Pro.
- Before accepting the first real payments, plan boundaries should be visible and understandable in the product.

## Regionalization

Mexico remains the default market, but the product must not hard-code Mexico-only assumptions.

Each tenant should eventually support:

- Country.
- Phone country code.
- Currency.
- Time zone.
- Locale-sensitive formatting where needed.

WhatsApp behavior:

- WhatsApp links must use `https://api.whatsapp.com/send?phone=...`.
- Phone numbers must be normalized to international format.
- Do not hard-code `52` except as the Mexico default.
- Uruguay and future countries must work through tenant country/calling-code configuration.

## Hardware / Tauri Direction

Hardware integration is a side project and should not define the public SaaS baseline.

Primary purpose:

- Support owner-operated physical locations that need direct Windows hardware access:
  - CDSE.
  - Reparatech.
  - Electronica Morelos.

Hardware examples:

- Direct thermal printer access.
- Webcams.
- Local ports or device access.
- Future camera/RTSP/PTZ workflows.

Architecture principle:

- The SaaS must work fully as a web app.
- Tauri/Rust features are additive and environment-specific.
- Never assume that public SaaS users have Tauri, Windows, local printers, or native hardware access.
- Use environment detection and graceful web fallbacks.

## Launch Priorities

Before the first paid customer is accepted, prioritize:

1. Define and expose Normal vs Pro plan boundaries.
2. Make the 30-day trial clearly full Pro.
3. Add or validate tenant regional settings for country, calling code, currency, and time zone.
4. Ensure WhatsApp notifications work internationally through normalized numbers.
5. Add a clear subscription/status page: trial, active, expired, suspended, current plan, renewal or expiration date.
6. Centralize feature gating so plan checks are not scattered ad hoc through the app.

## Implementation Preference

When adding SaaS monetization or regionalization:

- Keep the web SaaS path first.
- Keep hardware/Tauri behind wrappers and capability checks.
- Prefer centralized plan/feature helpers over inline `plan === "pro"` checks.
- Preserve tenant isolation with the existing Supabase client conventions.

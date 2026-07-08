import { ImageResponse } from "next/og"

export const alt = "ReparaHub, software para talleres de reparación"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 54%, #d1fae5 100%)",
          color: "#f8fafc",
          padding: "74px 80px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", maxWidth: 760, flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28, fontWeight: 800, color: "#1d4ed8" }}>
            <div style={{ display: "flex", height: 54, width: 54, alignItems: "center", justifyContent: "center", borderRadius: 12, background: "#2563eb", color: "white" }}>TC</div>
            ReparaHub
          </div>
          <div style={{ marginTop: 44, fontSize: 66, fontWeight: 900, lineHeight: 1.02, letterSpacing: "-3px" }}>
            Controla tu taller y entrega cada equipo a tiempo
          </div>
          <div style={{ marginTop: 30, fontSize: 28, lineHeight: 1.4, color: "#475569" }}>
            Reparaciones, punto de venta, inventario, apartados y cotizaciones.
          </div>
        </div>
        <div style={{ display: "flex", height: 360, width: 260, flexDirection: "column", justifyContent: "space-between", background: "#1d4ed8", padding: 34, color: "white", boxShadow: "18px 18px 0 #bfdbfe" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#bfdbfe" }}>30 DÍAS</div>
          <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1 }}>PLAN PRO</div>
          <div style={{ fontSize: 22, lineHeight: 1.3 }}>Sin tarjeta de crédito</div>
        </div>
      </div>
    ),
    size,
  )
}

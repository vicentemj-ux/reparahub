import * as React from "react"

interface WelcomeEmailProps {
  ownerName: string
  workshopName: string
  dashboardUrl: string
}

export function WelcomeEmail({ ownerName, workshopName, dashboardUrl }: WelcomeEmailProps) {
  return (
    <div
      style={{
        margin: 0,
        padding: "24px",
        backgroundColor: "#f8fafc",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          maxWidth: "620px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            backgroundColor: "#eff6ff",
            borderBottom: "1px solid #dbeafe",
            padding: "20px 24px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              lineHeight: "30px",
              fontWeight: 800,
              color: "#2563eb",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            Bienvenido a ReparaHub
          </h1>
        </div>

        <div style={{ padding: "24px" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: "15px", lineHeight: "24px", color: "#f8fafc" }}>
            Hola {ownerName},
          </p>
          <p style={{ margin: "0 0 12px 0", fontSize: "15px", lineHeight: "24px", color: "#f8fafc" }}>
            Tu cuenta para <strong>{workshopName}</strong> se creo correctamente.
          </p>
          <p style={{ margin: "0 0 12px 0", fontSize: "15px", lineHeight: "24px", color: "#f8fafc" }}>
            Tus <strong>30 dias de prueba gratuita</strong> ya comenzaron automaticamente.
          </p>
          <p style={{ margin: "0 0 20px 0", fontSize: "14px", lineHeight: "22px", color: "#475569" }}>
            Ingresa a tu panel para empezar a gestionar reparaciones, inventario y ventas.
          </p>

          <div style={{ textAlign: "center", marginTop: "4px" }}>
            <a
              href={dashboardUrl}
              style={{
                display: "inline-block",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "10px",
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Ir a mi Panel
            </a>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #e2e8f0",
            padding: "14px 24px",
            backgroundColor: "#f8fafc",
            fontSize: "12px",
            lineHeight: "18px",
            color: "#64748b",
            textAlign: "center",
          }}
        >
          ReparaHub · Plataforma SaaS para talleres de reparacion
        </div>
      </div>
    </div>
  )
}


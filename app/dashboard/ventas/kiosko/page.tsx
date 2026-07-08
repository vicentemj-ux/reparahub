import { redirect } from "next/navigation"

export default function VentasKioskoEntryPage() {
  redirect("/dashboard/ventas?view=kiosko")
}

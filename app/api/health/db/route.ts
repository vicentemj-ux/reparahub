import { NextResponse } from "next/server"
import { checkDbHealth } from "@/lib/db-health"

export async function GET() {
  const result = await checkDbHealth()
  if (result.ok) {
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json(
    {
      ok: false,
      error: result.error,
    },
    { status: 500 },
  )
}

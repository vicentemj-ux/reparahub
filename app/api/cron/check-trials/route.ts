import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // Fail closed: if CRON_SECRET is not configured, reject all requests
    // instead of allowing unauthenticated access.
    return NextResponse.json({ success: false, error: "Server misconfiguration" }, { status: 500 })
  }
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  // Temporal hard-off to avoid Supabase/Resend runtime crashes during migration.
  return NextResponse.json({
    success: true,
    skipped: true,
    reason: "check-trials cron temporalmente desactivado",
    date: new Date().toISOString(),
  })
}

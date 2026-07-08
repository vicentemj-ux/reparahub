import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-static"

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/auth/login?error=oauth_not_enabled", request.url))
}

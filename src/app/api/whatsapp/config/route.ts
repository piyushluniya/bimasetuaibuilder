import { NextResponse } from "next/server"

// Required: this handler reads nothing from the request, so Next.js would
// otherwise prerender it at build time and freeze whatever env existed then —
// defeating the whole point of serving these values at runtime.
export const dynamic = "force-dynamic"

// The sandbox number and its join phrase are assigned by Twilio and differ per
// account, so they're served at runtime instead of being inlined at build time.
// Correcting a wrong phrase is then an env-var update, not a rebuild + redeploy.
export async function GET() {
  const from = process.env.TWILIO_WHATSAPP_FROM || ""
  return NextResponse.json({
    number: from.replace(/^whatsapp:/, "") || "+14155238886",
    joinCode: process.env.TWILIO_SANDBOX_JOIN_CODE || ""
  })
}

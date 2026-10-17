import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

// POST /api/whatsapp/link
// Body: { profileId, phone }
// Writes whatsappNumber directly via the Admin SDK — same "server bypasses
// rules" shape as the old direct-DynamoDB approach, just on Firestore now.
export async function POST(req: NextRequest) {
  try {
    const { profileId, phone } = await req.json()
    if (!profileId || !phone) {
      return NextResponse.json({ error: "profileId and phone required" }, { status: 400 })
    }

    await adminDb().collection("userProfiles").doc(profileId).update({
      whatsappNumber: phone,
      whatsappConnected: false,
      waSessionState: "",
      updatedAt: new Date().toISOString()
    })

    console.log(`[whatsapp/link] Saved number ${phone} for profileId ${profileId}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[whatsapp/link] Error:", err)
    return NextResponse.json({ error: "Failed to save number" }, { status: 500 })
  }
}

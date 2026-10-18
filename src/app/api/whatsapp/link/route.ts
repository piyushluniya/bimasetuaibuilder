import { NextRequest, NextResponse } from "next/server"
import { adminDb, requireUserId } from "@/lib/firebase-admin"
import { normalizePhone } from "@/lib/phone"

// POST /api/whatsapp/link
// Body: { profileId, phone }
// Linking a WhatsApp number is what lets that number read the profile's policy
// over WhatsApp, so it must be session-authenticated and ownership-checked —
// otherwise anyone could attach their own number to someone else's profile.
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { profileId, phone } = await req.json()
    if (!profileId || !phone) {
      return NextResponse.json({ error: "profileId and phone required" }, { status: 400 })
    }

    const normalized = normalizePhone(phone)
    if (!normalized) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
    }

    const ref = adminDb().collection("userProfiles").doc(profileId)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await ref.update({
      whatsappNumber: normalized,
      whatsappConnected: false,
      waSessionState: "",
      updatedAt: new Date().toISOString()
    })

    console.log(`[whatsapp/link] Saved number for profileId ${profileId}`)
    return NextResponse.json({ ok: true, phone: normalized })
  } catch (err) {
    console.error("[whatsapp/link] Error:", err)
    const status = err instanceof Error && err.message === "UNAUTHENTICATED" ? 401 : 500
    return NextResponse.json({ error: "Failed to save number" }, { status })
  }
}

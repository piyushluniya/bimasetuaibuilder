import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// POST /api/whatsapp/unlink
// Body: { profileId }
// Clears all WhatsApp-related fields from the profile.
export async function POST(req: NextRequest) {
  try {
    const { profileId } = await req.json()
    if (!profileId) {
      return NextResponse.json({ error: "profileId required" }, { status: 400 })
    }

    await adminDb().collection("userProfiles").doc(profileId).update({
      whatsappNumber: FieldValue.delete(),
      whatsappConnected: FieldValue.delete(),
      waSessionState: FieldValue.delete(),
      updatedAt: new Date().toISOString()
    })

    console.log(`[whatsapp/unlink] Unlinked WhatsApp for profileId ${profileId}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[whatsapp/unlink] Error:", err)
    return NextResponse.json({ error: "Failed to unlink" }, { status: 500 })
  }
}

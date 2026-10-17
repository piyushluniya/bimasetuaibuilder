import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

// GET /api/whatsapp/status?phone=%2B919876543210
// Returns { connected: boolean } by querying Firestore directly (Admin SDK,
// bypasses Security Rules — same shape as the old direct-DynamoDB scan).
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone")
  if (!phone) return NextResponse.json({ connected: false })

  try {
    const snap = await adminDb()
      .collection("userProfiles")
      .where("whatsappNumber", "==", phone)
      .limit(1)
      .get()

    const connected = snap.docs[0]?.data()?.whatsappConnected === true
    return NextResponse.json({ connected })
  } catch (err) {
    console.error("[whatsapp/status] Firestore error:", err)
    return NextResponse.json({ connected: false })
  }
}

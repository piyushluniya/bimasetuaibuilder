import { NextRequest, NextResponse } from "next/server"
import { adminDb, requireUserId } from "@/lib/firebase-admin"

const COLLECTION = "userPolicies"

// GET /api/policies/:id — used by the policies page to poll parsing status.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId()
    const ref = adminDb().collection(COLLECTION).doc(params.id)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ data: { id: snap.id, ...snap.data() } })
  } catch (err) {
    console.error("[api/policies/[id] GET] Error:", err)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

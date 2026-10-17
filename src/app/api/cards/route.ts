import { NextRequest, NextResponse } from "next/server"
import { adminDb, requireUserId } from "@/lib/firebase-admin"
import type { UserCard } from "@/lib/firestore-types"

const COLLECTION = "userCards"

export async function GET() {
  try {
    const userId = await requireUserId()
    const snap = await adminDb().collection(COLLECTION).where("userId", "==", userId).get()
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as UserCard[]
    return NextResponse.json({ data })
  } catch (err) {
    console.error("[api/cards GET] Error:", err)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json()
    const doc = {
      userId,
      cardName: body.cardName,
      bankName: body.bankName ?? null,
      cardType: body.cardType ?? null,
      coverageData: body.coverageData ?? null,
      hiddenValue: body.hiddenValue ?? 0
    }
    const ref = await adminDb().collection(COLLECTION).add(doc)
    return NextResponse.json({ data: { id: ref.id, ...doc } })
  } catch (err) {
    console.error("[api/cards POST] Error:", err)
    return NextResponse.json({ error: "Failed to save card" }, { status: 500 })
  }
}

// DELETE /api/cards?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const ref = adminDb().collection(COLLECTION).doc(id)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    await ref.delete()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/cards DELETE] Error:", err)
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 })
  }
}

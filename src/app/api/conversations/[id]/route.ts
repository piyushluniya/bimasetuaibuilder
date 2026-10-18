import { NextRequest, NextResponse } from "next/server"
import { adminDb, requireUserId } from "@/lib/firebase-admin"
import type { ChatConversation } from "@/lib/firestore-types"

const COLLECTION = "chatConversations"

type Params = { params: { id: string } }

async function ownedDoc(id: string) {
  const userId = await requireUserId()
  const ref = adminDb().collection(COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists || snap.data()?.userId !== userId) return null
  return { ref, snap }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const found = await ownedDoc(params.id)
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const data = { id: found.snap.id, ...found.snap.data() } as ChatConversation
    return NextResponse.json({ data })
  } catch (err) {
    console.error("[api/conversations/:id GET] Error:", err)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const found = await ownedDoc(params.id)
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = await req.json()
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (body.messages) update.messages = body.messages
    if (body.title?.trim()) update.title = body.title.trim()

    await found.ref.update(update)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/conversations/:id PATCH] Error:", err)
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const found = await ownedDoc(params.id)
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await found.ref.delete()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/conversations/:id DELETE] Error:", err)
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 })
  }
}

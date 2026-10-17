import { NextRequest, NextResponse } from "next/server"
import { adminDb, requireUserId } from "@/lib/firebase-admin"
import type { UserProfile } from "@/lib/firestore-types"

const COLLECTION = "userProfiles"

// GET /api/profile — mirrors the shape of the old client.models.UserProfile.list()
// call ({ data: [...] }) so page components didn't need broader rewrites.
export async function GET() {
  try {
    const userId = await requireUserId()
    const snap = await adminDb().collection(COLLECTION).where("userId", "==", userId).limit(1).get()
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as UserProfile[]
    return NextResponse.json({ data })
  } catch (err) {
    console.error("[api/profile GET] Error:", err)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json()
    const doc = {
      userId,
      name: body.name,
      age: body.age ?? null,
      city: body.city ?? null,
      familyMembers: body.familyMembers ?? null,
      createdAt: body.createdAt || new Date().toISOString()
    }
    const ref = await adminDb().collection(COLLECTION).add(doc)
    return NextResponse.json({ data: { id: ref.id, ...doc } })
  } catch (err) {
    console.error("[api/profile POST] Error:", err)
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
  }
}

// PATCH /api/profile — body: { id, ...fields to update }
export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const ref = adminDb().collection(COLLECTION).doc(id)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await ref.update({ ...updates, updatedAt: new Date().toISOString() })
    const updated = await ref.get()
    return NextResponse.json({ data: { id: updated.id, ...updated.data() } })
  } catch (err) {
    console.error("[api/profile PATCH] Error:", err)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

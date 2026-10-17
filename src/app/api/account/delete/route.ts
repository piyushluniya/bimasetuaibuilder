import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

const COLLECTIONS = ["userProfiles", "userPolicies", "userCards", "chatMessages"]

async function deleteAllByUserId(collection: string, userId: string): Promise<number> {
  const snap = await adminDb().collection(collection).where("userId", "==", userId).get()
  await Promise.all(snap.docs.map((d) => d.ref.delete()))
  return snap.size
}

// POST /api/account/delete
// Body: { userId }
// Deletes all Firestore records for this user across all collections.
// The Firebase Auth user deletion is handled client-side via deleteUser() from firebase/auth.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    console.log(`[account/delete] Deleting all data for userId: ${userId}`)

    const [profiles, policies, cards, chats] = await Promise.all(
      COLLECTIONS.map((c) => deleteAllByUserId(c, userId).catch(() => 0))
    )

    console.log(`[account/delete] Deleted: ${profiles} profiles, ${policies} policies, ${cards} cards, ${chats} chats`)
    return NextResponse.json({ ok: true, deleted: { profiles, policies, cards, chats } })
  } catch (err) {
    console.error("[account/delete] Error:", err)
    return NextResponse.json({ error: "Failed to delete account data" }, { status: 500 })
  }
}

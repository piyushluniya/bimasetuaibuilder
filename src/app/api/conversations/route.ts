import { NextRequest, NextResponse } from "next/server"
import { adminDb, requireUserId } from "@/lib/firebase-admin"
import type { ChatConversation, ChatMessage } from "@/lib/firestore-types"

const COLLECTION = "chatConversations"
const TITLE_MAX = 60

function titleFromMessages(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user")
  if (!firstUser) return "New conversation"
  const text = firstUser.content.trim().replace(/\s+/g, " ")
  return text.length > TITLE_MAX ? text.slice(0, TITLE_MAX - 1) + "…" : text
}

// Listing omits `messages` so the sidebar doesn't pull every transcript.
// Sorting happens here rather than via orderBy to avoid needing a composite
// index on (userId, updatedAt) for what is always a small per-user set.
export async function GET() {
  try {
    const userId = await requireUserId()
    const snap = await adminDb().collection(COLLECTION).where("userId", "==", userId).get()
    const data = snap.docs
      .map((d) => {
        const { title, createdAt, updatedAt } = d.data()
        return { id: d.id, title, createdAt, updatedAt }
      })
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    return NextResponse.json({ data })
  } catch (err) {
    console.error("[api/conversations GET] Error:", err)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json()
    const messages: ChatMessage[] = body.messages ?? []
    const now = new Date().toISOString()

    const doc = {
      userId,
      title: body.title?.trim() || titleFromMessages(messages),
      messages,
      createdAt: now,
      updatedAt: now
    }
    const ref = await adminDb().collection(COLLECTION).add(doc)
    return NextResponse.json({ data: { id: ref.id, ...doc } as ChatConversation })
  } catch (err) {
    console.error("[api/conversations POST] Error:", err)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }
}

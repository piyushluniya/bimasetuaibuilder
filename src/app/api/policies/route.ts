import { NextRequest, NextResponse } from "next/server"
import { adminDb, requireUserId } from "@/lib/firebase-admin"
import { getBucket } from "@/lib/gcs"
import type { UserPolicy } from "@/lib/firestore-types"

const COLLECTION = "userPolicies"

export async function GET() {
  try {
    const userId = await requireUserId()
    const snap = await adminDb().collection(COLLECTION).where("userId", "==", userId).get()
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as UserPolicy[]
    return NextResponse.json({ data })
  } catch (err) {
    console.error("[api/policies GET] Error:", err)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

// POST /api/policies — multipart/form-data with a "file" field (PDF).
// Uploads to Cloud Storage, creates the Firestore record, and triggers parsing.
// The browser never touches Cloud Storage directly (server-mediated, same as Firestore).
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 })
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 10MB allowed" }, { status: 400 })
    }

    const gcsKey = `policies/${userId}/${Date.now()}-${file.name}`

    const ref = await adminDb().collection(COLLECTION).add({
      userId,
      fileName: file.name,
      gcsKey,
      status: "uploading",
      insurer: ""
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    await getBucket().file(gcsKey).save(buffer, { contentType: "application/pdf" })

    await ref.update({ status: "parsing" })

    // Parsing is NOT kicked off here. Cloud Run throttles CPU to ~zero once a
    // response is returned, so a fire-and-forget fetch never actually runs and
    // the policy sits at "parsing" forever. The browser calls
    // /api/policy-parser itself after this resolves, which keeps a real
    // request open for the duration of the work.
    const created = await ref.get()
    return NextResponse.json({ data: { id: created.id, ...created.data() } })
  } catch (err) {
    console.error("[api/policies POST] Error:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

// DELETE /api/policies?id=xxx
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
    const gcsKey = snap.data()?.gcsKey as string | undefined
    await ref.delete()
    if (gcsKey) {
      await getBucket().file(gcsKey).delete().catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/policies DELETE] Error:", err)
    return NextResponse.json({ error: "Failed to delete policy" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, SESSION_COOKIE_NAME } from "@/lib/firebase-admin"

const SESSION_EXPIRES_IN_MS = 14 * 24 * 60 * 60 * 1000 // 14 days — Firebase's max for session cookies

// POST /api/auth/session
// Body: { idToken } — the Firebase ID token from a fresh client-side sign-in.
// Exchanges it for an httpOnly session cookie that middleware.ts can check.
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json()
    if (!idToken) return NextResponse.json({ error: "idToken required" }, { status: 400 })

    await adminAuth().verifyIdToken(idToken)
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS })

    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRES_IN_MS / 1000,
      path: "/"
    })
    return res
  } catch (err) {
    console.error("[auth/session] Error:", err)
    return NextResponse.json({ error: "Failed to create session" }, { status: 401 })
  }
}

// DELETE /api/auth/session — clears the session cookie on sign-out.
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE_NAME)
  return res
}

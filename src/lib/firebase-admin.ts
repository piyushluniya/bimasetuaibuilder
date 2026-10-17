import { initializeApp, getApps, applicationDefault, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { cookies } from "next/headers"

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]
  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  if (!projectId) throw new Error("GOOGLE_CLOUD_PROJECT is not configured")
  // Same Application Default Credentials as Vertex AI (GOOGLE_APPLICATION_CREDENTIALS
  // locally; the attached service account automatically on Cloud Run).
  return initializeApp({ credential: applicationDefault(), projectId })
}

export function adminAuth() {
  return getAuth(getAdminApp())
}

export function adminDb() {
  return getFirestore(getAdminApp())
}

export const SESSION_COOKIE_NAME = "session"

// Verifies the httpOnly session cookie set by /api/auth/session and returns
// the signed-in user's uid. Throws if there's no valid session.
export async function requireUserId(): Promise<string> {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value
  if (!sessionCookie) throw new Error("UNAUTHENTICATED")
  const decoded = await adminAuth().verifySessionCookie(sessionCookie)
  return decoded.uid
}

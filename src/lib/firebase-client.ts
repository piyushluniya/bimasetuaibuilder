import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, onAuthStateChanged, type Auth, type User } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

// Next.js prerenders "use client" pages (build-time SSR for the initial HTML),
// and getAuth() throws immediately on invalid/placeholder config — which would
// otherwise crash the entire production build. Auth is only ever used from
// browser event handlers anyway, so it's safe (and necessary) to skip
// initializing it server-side.
export const auth: Auth = typeof window !== "undefined"
  ? getAuth(getFirebaseApp())
  : (undefined as unknown as Auth)

// Firebase's auth state is restored asynchronously on page load; this waits
// for that first resolution instead of racing auth.currentUser (which is
// briefly null even for a signed-in user). Mirrors Amplify's getCurrentUser().
export function getCurrentUser(): Promise<User | null> {
  if (typeof window === "undefined") return Promise.resolve(null)
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

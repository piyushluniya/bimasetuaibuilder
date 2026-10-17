import { NextRequest, NextResponse } from "next/server"

const protectedPaths = ["/dashboard", "/policies", "/chat", "/onboarding", "/profile"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  if (!isProtected) return NextResponse.next()

  // Fast cookie check: /api/auth/session sets this httpOnly cookie after Firebase
  // sign-in. This avoids a round-trip to verify the session on every request —
  // matches the shallow-check bar of the previous Cognito cookie check.
  const hasSessionCookie = request.cookies.has("session")

  if (hasSessionCookie) return NextResponse.next()

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("redirect", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cards/:path*",
    "/policies/:path*",
    "/chat/:path*",
    "/onboarding/:path*",
    "/profile/:path*"
  ]
}

"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/use-toast"

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [email, setEmail] = useState(searchParams.get("email") || "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      toast({ title: "Account created!", description: "You can now sign in." })
      router.push("/login")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Sign up failed"
      toast({ title: "Sign up failed", description: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-card">
      {/* Left Side: Visual Anchor (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative bg-primary overflow-hidden items-end p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary/50" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }}
        />
        <div className="relative z-10 max-w-lg mb-12">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-8 border border-white/20">
            <Icon name="shield_locked" filled className="text-white text-4xl" />
          </div>
          <h1 className="font-headline text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Insurance Intelligence for Every Indian
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Navigate the complexities of health and life policies with clarity. BimaSetu bridges
            the gap between your needs and the right coverage using advanced, secure AI.
          </p>
        </div>
      </div>

      {/* Right Side: Authentication Canvas */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center items-center p-4 md:p-12 bg-card relative">
        {/* Mobile logo */}
        <Link href="/" className="md:hidden flex items-center gap-2 mb-8 mt-6 self-start ml-2">
          <Icon name="health_and_safety" filled className="text-secondary text-2xl" />
          <span className="font-headline text-xl font-bold text-primary">BimaSetu</span>
        </Link>

        <div className="w-full max-w-[420px] bg-card rounded-xl border border-border shadow-sm p-8">
          {/* Desktop logo within card */}
          <Link href="/" className="hidden md:flex items-center gap-2 mb-8">
            <span className="font-headline text-xl font-bold text-primary">BimaSetu</span>
          </Link>

          <div className="mb-8">
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-2">
              Create Your Account
            </h2>
            <p className="text-sm text-muted-foreground">
              Discover your hidden insurance benefits for free.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mb-6">
            <Link
              href="/login"
              className="flex-1 pb-3 text-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Login
            </Link>
            <span className="flex-1 pb-3 text-center text-sm font-bold text-primary border-b-2 border-primary">
              Sign Up
            </span>
          </div>

          <form onSubmit={handleSignUp} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="flex justify-between items-baseline text-xs font-bold text-muted-foreground">
                <span>Email Address</span>
                <span className="font-normal text-muted-foreground/70">ईमेल</span>
              </Label>
              <div className="relative">
                <Icon
                  name="mail"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl"
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 rounded-lg pl-10 focus-visible:ring-secondary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="flex justify-between items-baseline text-xs font-bold text-muted-foreground">
                <span>Password</span>
                <span className="font-normal text-muted-foreground/70">पासवर्ड</span>
              </Label>
              <div className="relative">
                <Icon
                  name="lock"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl"
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-12 rounded-lg pl-10 focus-visible:ring-secondary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password" className="flex justify-between items-baseline text-xs font-bold text-muted-foreground">
                <span>Confirm Password</span>
                <span className="font-normal text-muted-foreground/70">पासवर्ड की पुष्टि करें</span>
              </Label>
              <div className="relative">
                <Icon
                  name="lock"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl"
                />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 rounded-lg pl-10 focus-visible:ring-secondary"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold gap-2 mt-2"
            >
              {loading && <Icon name="progress_activity" className="animate-spin text-lg" />}
              Create Free Account
              {!loading && <Icon name="arrow_forward" className="text-lg" />}
            </Button>
          </form>
        </div>

        <div className="mt-8 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/login" className="text-secondary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-card text-muted-foreground">
          Loading...
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  )
}

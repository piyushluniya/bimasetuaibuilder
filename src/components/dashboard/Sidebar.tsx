"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase-client"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/policies", icon: "description", label: "My Policies" },
  { href: "/claims", icon: "assignment_turned_in", label: "Claims" },
  { href: "/chat", icon: "smart_toy", label: "AI Assistant" },
  { href: "/profile", icon: "person", label: "Profile" }
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  async function handleSignOut() {
    try {
      await signOut(auth)
      await fetch("/api/auth/session", { method: "DELETE" })
      router.push("/login")
    } catch {
      toast({ title: "Sign out failed", variant: "destructive" })
    }
  }

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 py-6 bg-muted border-r border-border shadow-sm z-40">
      {/* Logo */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Icon name="shield_locked" filled className="text-xl leading-none" />
        </div>
        <div>
          <h1 className="font-headline font-bold text-lg text-primary leading-tight">BimaSetu</h1>
          <p className="text-xs text-muted-foreground">Insurance Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-background"
              )}
            >
              <Icon name={item.icon} filled={isActive} className="text-xl leading-none" />
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Sign out */}
      <div className="px-4 pt-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-background gap-3 px-4 py-3 h-auto font-semibold"
          onClick={handleSignOut}
        >
          <Icon name="logout" className="text-xl leading-none" />
          Logout
        </Button>
      </div>
    </nav>
  )
}

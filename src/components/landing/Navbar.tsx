"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-headline text-xl font-bold text-primary">BimaSetu</span>
          <span className="hidden border-l border-border pl-2 text-sm text-muted-foreground md:inline-block">
            बीमासेतु
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            Features
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            className="gap-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <Link href="/signup">
              <Icon name="chat" className="text-lg leading-none" />
              Get Started Free
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

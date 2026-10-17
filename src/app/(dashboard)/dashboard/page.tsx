"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { UserCard, UserPolicy } from "@/lib/firestore-types"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

type ParsedCoverage = {
  insurer: string
  policyType: string
  sumInsured: number
  policyPeriod?: { from: string; to: string }
  waitingPeriods?: Array<{ condition: string; period: string }>
  exclusions?: string[]
  roomRentLimit?: number
  coPay?: number
}

// Circular progress SVG component
function CircularProgress({ percent, size = 80 }: { percent: number; size?: number }) {
  const stroke = 7
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - percent / 100)
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={percent === 100 ? "hsl(var(--secondary))" : "hsl(var(--primary))"}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  )
}

const quickActions = [
  { href: "/policies", icon: "credit_card", label: "Discover card insurance", sub: "Find hidden benefits" },
  { href: "/policies", icon: "upload_file", label: "Upload a policy", sub: "AI-powered parsing" },
  { href: "/chat", icon: "forum", label: "Ask about my coverage", sub: "Coverage Q&A" },
  { href: "/claims", icon: "gavel", label: "Analyze a claim rejection", sub: "IRDAI-backed analysis" }
]

export default function DashboardPage() {
  const [userName, setUserName] = useState("there")
  const [profileComplete, setProfileComplete] = useState(false)
  const [waConnected, setWaConnected] = useState(false)
  const [cards, setCards] = useState<UserCard[]>([])
  const [policies, setPolicies] = useState<UserPolicy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, cardsRes, policiesRes] = await Promise.all([
          fetch("/api/profile").then((r) => r.json()),
          fetch("/api/cards").then((r) => r.json()),
          fetch("/api/policies").then((r) => r.json())
        ])

        if (profileRes.data.length > 0) {
          const p = profileRes.data[0]
          setUserName(p.name || "there")
          setProfileComplete(!!(p.name && p.age && p.city))
          setWaConnected(p.whatsappConnected || false)
        }

        setCards(cardsRes.data)
        setPolicies(policiesRes.data)
      } catch {
        // User not onboarded yet
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const totalCardCoverage = cards.reduce((sum, c) => sum + (c.hiddenValue || 0), 0)
  const readyPolicies = policies.filter((p) => p.status === "ready")

  // Parse coverage from first ready policy
  let parsedCoverage: ParsedCoverage | null = null
  if (readyPolicies.length > 0 && readyPolicies[0].parsedCoverage) {
    try { parsedCoverage = JSON.parse(readyPolicies[0].parsedCoverage) } catch {}
  }

  // Alerts from waiting periods & policy expiry
  const alerts: Array<{ type: "warning" | "info"; message: string }> = []
  if (parsedCoverage?.waitingPeriods && parsedCoverage.waitingPeriods.length > 0) {
    parsedCoverage.waitingPeriods.slice(0, 2).forEach((wp) => {
      alerts.push({ type: "info", message: `Waiting period: ${wp.condition} — ${wp.period}` })
    })
  }
  if (parsedCoverage?.policyPeriod?.to && parsedCoverage.policyPeriod.to !== "Not specified") {
    alerts.push({ type: "warning", message: `Policy expires: ${parsedCoverage.policyPeriod.to}` })
  }
  if (alerts.length === 0 && readyPolicies.length > 0) {
    alerts.push({ type: "info", message: "No urgent alerts — your coverage looks active" })
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const steps = [
    { label: "Profile info", done: profileComplete },
    { label: "Card added", done: cards.length > 0 },
    { label: "Policy parsed", done: policies.some((p) => p.status === "ready") },
    { label: "WhatsApp linked", done: waConnected }
  ]
  const doneCount = steps.filter((s) => s.done).length
  const pct = doneCount * 25

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-12 max-w-[1280px] mx-auto">
      {/* Header */}
      <header className="mb-8 md:mb-12">
        <h1 className="font-headline text-2xl md:text-4xl font-bold text-primary">Overview</h1>
        <p className="text-muted-foreground mt-2">
          {greeting}, {userName}. Here&apos;s your insurance intelligence summary.
        </p>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Primary Cards (8 cols) */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* 1. Insurance Card Summary */}
          <section className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
            {parsedCoverage ? (
              <>
                <div className="flex justify-between items-start mb-6 gap-4">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-semibold mb-3">
                      <Icon name="check_circle" filled className="text-sm leading-none" /> Active Policy
                    </span>
                    <h3 className="font-headline text-xl md:text-2xl font-semibold text-primary truncate">
                      {parsedCoverage.insurer}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {parsedCoverage.policyType}
                      {parsedCoverage.policyPeriod?.to && parsedCoverage.policyPeriod.to !== "Not specified"
                        ? ` • Valid till ${parsedCoverage.policyPeriod.to}`
                        : ""}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center border border-border shrink-0">
                    <Icon name="health_and_safety" className="text-primary text-2xl leading-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-muted rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground">Sum Insured</p>
                    <p className="font-headline text-xl font-semibold text-primary mt-1">
                      ₹{parsedCoverage.sumInsured}L
                    </p>
                  </div>
                  {parsedCoverage.roomRentLimit !== undefined && parsedCoverage.roomRentLimit > 0 && (
                    <div className="bg-muted rounded-lg p-3 border border-border/50">
                      <p className="text-xs text-muted-foreground">Room Rent</p>
                      <p className="font-headline text-xl font-semibold text-primary mt-1">
                        ₹{parsedCoverage.roomRentLimit.toLocaleString("en-IN")}
                        <span className="text-xs text-muted-foreground font-normal">/day</span>
                      </p>
                    </div>
                  )}
                  <div className="bg-muted rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground">Co-pay</p>
                    <p className="font-headline text-xl font-semibold text-primary mt-1">
                      {parsedCoverage.coPay ? `${parsedCoverage.coPay}%` : "None"}
                    </p>
                  </div>
                </div>
                {parsedCoverage.waitingPeriods && parsedCoverage.waitingPeriods.length > 0 && (
                  <div className="pt-4 border-t border-border flex flex-wrap gap-2 mb-4">
                    {parsedCoverage.waitingPeriods.slice(0, 3).map((wp, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-muted rounded text-xs text-muted-foreground flex items-center gap-1"
                      >
                        <Icon name="timer" className="text-sm leading-none" /> {wp.condition}: {wp.period}
                      </span>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href="/policies">View Policy Details</Link>
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <Icon name="shield" className="text-5xl text-muted-foreground/30 leading-none" />
                <p className="text-sm text-muted-foreground mt-2 mb-3">No policy parsed yet</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/policies">Upload Policy</Link>
                </Button>
              </div>
            )}
          </section>

          {/* 2. Hidden Card Insurance (Discovery feature) */}
          <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
            {cards.length > 0 ? (
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="w-full md:w-1/3 shrink-0">
                  <div className="aspect-[1.58/1] rounded-lg bg-gradient-to-br from-primary to-secondary shadow-lg p-4 flex flex-col justify-between text-primary-foreground overflow-hidden relative">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-headline font-bold text-lg truncate">{cards[0].cardName}</span>
                      <Icon name="credit_card" className="text-2xl leading-none shrink-0" />
                    </div>
                    <div>
                      <p className="text-xs opacity-80">HIDDEN BENEFITS</p>
                      <p className="font-headline text-xl font-semibold mt-1">
                        ₹{totalCardCoverage.toLocaleString("en-IN")}L{" "}
                        <span className="text-xs font-normal opacity-80">Value</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-2/3">
                  <h3 className="font-headline text-xl font-semibold text-primary mb-2">
                    Hidden Insurance Discovered
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Setu found complimentary coverage linked to your mapped credit cards.
                  </p>
                  <div className="space-y-2">
                    {cards.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        className="flex justify-between items-center p-3 bg-muted rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center shrink-0">
                            <Icon name="credit_card" className="text-accent-foreground text-base leading-none" />
                          </div>
                          <span className="text-sm text-foreground truncate">{c.cardName}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary shrink-0 ml-2">
                          ₹{c.hiddenValue || 0}L
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/policies">Manage Cards</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Icon name="credit_card" className="text-5xl text-muted-foreground/30 leading-none" />
                <p className="text-sm text-muted-foreground mt-2 mb-3">No cards added yet</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/policies">Add a Card</Link>
                </Button>
              </div>
            )}
          </section>

          {/* Quick Actions Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <Link
                key={action.label}
                href={action.href}
                className={cn(
                  "rounded-xl p-4 flex flex-col items-center justify-center gap-3 text-center min-h-[120px] transition-colors shadow-sm",
                  i === 0
                    ? "col-span-2 md:col-span-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : "bg-card border border-border hover:bg-muted"
                )}
              >
                <Icon
                  name={action.icon}
                  className={cn(
                    "text-3xl leading-none",
                    i === 0 ? "" : i === 3 ? "text-destructive" : "text-primary"
                  )}
                />
                <span className="text-sm font-semibold leading-tight">{action.label}</span>
              </Link>
            ))}
          </section>
        </div>

        {/* Right Column: Secondary Cards (4 cols) */}
        <div className="md:col-span-4 flex flex-col gap-6">
          {/* 3. Alerts & Reminders */}
          <section className="bg-card border border-border border-l-4 border-l-secondary rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="notifications_active" className="text-secondary text-xl leading-none" />
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">Alerts &amp; Reminders</h3>
            </div>
            {alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert, i) => (
                  <div key={i}>
                    <div className="flex gap-3 items-start">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                          alert.type === "warning" ? "bg-destructive" : "bg-secondary"
                        )}
                      />
                      <p className="text-sm text-foreground">{alert.message}</p>
                    </div>
                    {i < alerts.length - 1 && <div className="h-px bg-border my-4" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Icon name="notifications" className="text-4xl text-muted-foreground/30 leading-none" />
                <p className="text-sm text-muted-foreground mt-2">Upload a policy to get alerts</p>
              </div>
            )}
          </section>

          {/* Profile Completeness */}
          <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
              Profile Completeness
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <CircularProgress percent={pct} size={72} />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">
                  {pct}%
                </span>
              </div>
              <div className="space-y-1.5 flex-1">
                {steps.map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5 text-xs">
                    <Icon
                      name="check_circle"
                      filled={s.done}
                      className={cn("text-sm leading-none", s.done ? "text-secondary" : "text-muted-foreground/30")}
                    />
                    <span className={s.done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Setu Insight (educational nugget) */}
          <section className="bg-primary text-primary-foreground rounded-xl p-5 relative overflow-hidden">
            <Icon name="lightbulb" className="absolute -bottom-4 -right-4 text-7xl opacity-10 leading-none" />
            <p className="text-xs font-semibold opacity-80 mb-1 uppercase tracking-wider">Setu Insight</p>
            <p className="text-sm leading-relaxed relative z-10">
              Did you know? Daycare procedures that take less than 24 hours are often fully covered — check your
              policy&apos;s daycare clause to be sure.
            </p>
          </section>
        </div>
      </div>

      {/* Empty state */}
      {cards.length === 0 && policies.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl mt-6">
          <div className="py-12 text-center px-6">
            <Icon name="shield_locked" className="text-6xl text-muted-foreground/30 leading-none" />
            <h3 className="text-xl font-headline font-semibold text-foreground mt-4 mb-2">
              Start discovering your coverage
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add your credit cards to find hidden insurance, or upload a policy PDF to get AI-parsed insights.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link href="/policies">Add a Card</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/policies">Upload Policy</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

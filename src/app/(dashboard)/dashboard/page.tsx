"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { UserCard, UserPolicy, UserProfile } from "@/lib/firestore-types"
import ProfileSetupDialog from "@/components/dashboard/ProfileSetupDialog"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/use-toast"
import { validatePolicyFile, uploadPolicyPdf } from "@/lib/policy-upload"
import { parsePolicyDate, addWaitingPeriod, formatPolicyDate, daysUntil, describeDuration } from "@/lib/policy-dates"
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

// The only place on this page that starts an action — the cards above explain
// what each one unlocks, but never duplicate these buttons.
const quickActions = [
  { href: "/policies", icon: "credit_card", label: "Discover card insurance", sub: "Find cover you already have" },
  { action: "upload" as const, icon: "upload_file", label: "Upload a policy", sub: "AI-powered parsing" },
  { href: "/chat", icon: "forum", label: "Ask about my coverage", sub: "Coverage Q&A" },
  { href: "/claims", icon: "gavel", label: "Analyze a claim rejection", sub: "Regulation-backed analysis" }
]

const POLICY_UNLOCKS = [
  "Sum insured, room-rent caps and co-pay, pulled out automatically",
  "Waiting periods and exclusions flagged before you need them",
  "Renewal and expiry reminders so cover never lapses",
  "Ask anything and get answers grounded in your own document"
]

const CARD_UNLOCKS = [
  "Air accident and personal accident cover",
  "Purchase protection and lost-card liability",
  "Travel and emergency medical cover abroad"
]

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [userName, setUserName] = useState("there")
  const [profileComplete, setProfileComplete] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [waConnected, setWaConnected] = useState(false)
  const [cards, setCards] = useState<UserCard[]>([])
  const [policies, setPolicies] = useState<UserPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [setupOpen, setSetupOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [profileRes, cardsRes, policiesRes] = await Promise.all([
        fetch("/api/profile").then((r) => r.json()),
        fetch("/api/cards").then((r) => r.json()),
        fetch("/api/policies").then((r) => r.json())
      ])

      const p: UserProfile | undefined = profileRes.data?.[0]
      const complete = !!(p?.name && p.age && p.city && p.phone)
      setUserName(p?.name || "there")
      setProfileId(p?.id ?? null)
      setProfileComplete(complete)
      setWaConnected(p?.whatsappConnected || false)
      // First visit after signup, or a profile left half-filled: the setup
      // dialog is the only way to complete it from here.
      setSetupOpen(!complete)

      setCards(cardsRes.data)
      setPolicies(policiesRes.data)
    } catch {
      // Not signed in / profile unreadable — middleware handles the redirect
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Upload starts here, then hands off to /policies where the parsing progress
  // and status polling already live.
  async function handlePickedFile(file: File) {
    const error = validatePolicyFile(file)
    if (error) {
      toast({ title: error, variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      await uploadPolicyPdf(file)
      toast({ title: "Upload complete!", description: "Parsing your policy with AI..." })
      router.push("/policies")
    } catch {
      toast({ title: "Upload failed", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const totalCardCoverage = cards.reduce((sum, c) => sum + (c.hiddenValue || 0), 0)
  const readyPolicies = policies.filter((p) => p.status === "ready")

  // Parse coverage from first ready policy
  let parsedCoverage: ParsedCoverage | null = null
  if (readyPolicies.length > 0 && readyPolicies[0].parsedCoverage) {
    try { parsedCoverage = JSON.parse(readyPolicies[0].parsedCoverage) } catch {}
  }

  // Alerts are derived from today's date at render time, so they stay current
  // without any stored state — an expiry that lapses becomes "expired" on its
  // own the next time the dashboard loads.
  const alerts: Array<{ type: "warning" | "info"; message: string }> = []

  const expiryDate = parsePolicyDate(parsedCoverage?.policyPeriod?.to)
  const policyExpired = !!expiryDate && daysUntil(expiryDate) < 0

  if (expiryDate) {
    const days = daysUntil(expiryDate)
    if (days < 0) {
      alerts.push({
        type: "warning",
        message: `Policy expired ${describeDuration(days)} ago, on ${formatPolicyDate(expiryDate)}. Renew to stay covered.`
      })
    } else if (days <= 30) {
      alerts.push({
        type: "warning",
        message: `Policy expires in ${describeDuration(days)} — on ${formatPolicyDate(expiryDate)}. Time to renew.`
      })
    } else {
      alerts.push({
        type: "info",
        message: `Policy valid until ${formatPolicyDate(expiryDate)} — ${describeDuration(days)} left.`
      })
    }
  } else if (parsedCoverage?.policyPeriod?.to) {
    alerts.push({ type: "info", message: `Policy expires: ${parsedCoverage.policyPeriod.to}` })
  }

  const policyStart = parsePolicyDate(parsedCoverage?.policyPeriod?.from)
  parsedCoverage?.waitingPeriods?.slice(0, 3).forEach((wp) => {
    const end = policyStart ? addWaitingPeriod(policyStart, wp.period) : null
    if (!end) {
      // Unparseable period, or no start date to count from — show it as-is
      // rather than guessing a completion date.
      alerts.push({ type: "info", message: `Waiting period — ${wp.condition}: ${wp.period}` })
      return
    }
    const days = daysUntil(end)
    if (days <= 0) {
      alerts.push({ type: "info", message: `${wp.condition}: waiting period complete — you're covered.` })
    } else {
      alerts.push({
        type: days <= 60 ? "warning" : "info",
        message: `${wp.condition}: covered from ${formatPolicyDate(end)} — ${describeDuration(days)} to go.`
      })
    }
  })

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
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mb-3",
                        policyExpired
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary/10 text-secondary"
                      )}
                    >
                      <Icon
                        name={policyExpired ? "error" : "check_circle"}
                        filled
                        className="text-sm leading-none"
                      />
                      {policyExpired ? "Expired Policy" : "Active Policy"}
                    </span>
                    <h3 className="font-headline text-xl md:text-2xl font-semibold text-primary truncate">
                      {parsedCoverage.insurer}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {parsedCoverage.policyType}
                      {expiryDate
                        ? ` • ${policyExpired ? "Expired on" : "Valid till"} ${formatPolicyDate(expiryDate)}`
                        : parsedCoverage.policyPeriod?.to
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
              <div className="flex flex-col md:flex-row gap-5 items-start">
                <div className="w-12 h-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                  <Icon name="document_scanner" className="text-2xl leading-none" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-headline text-xl font-semibold text-primary mb-1">
                    Your policy, finally in plain language
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload the PDF once and Setu AI reads every clause for you — then tells you what
                    it actually means.
                  </p>
                  <ul className="space-y-2">
                    {POLICY_UNLOCKS.map((item) => (
                      <li key={item} className="flex gap-2 items-start text-sm text-foreground">
                        <Icon name="check_circle" filled className="text-base leading-none text-secondary shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* 2. Card Insurance (Discovery feature) */}
          <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
            {cards.length > 0 ? (
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="w-full md:w-1/3 shrink-0">
                  <div className="aspect-[1.58/1] rounded-lg bg-gradient-to-br from-primary to-secondary shadow-lg p-4 flex flex-col justify-between text-primary-foreground overflow-hidden relative">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-headline font-bold text-lg truncate">Your cards</span>
                      <Icon name="credit_card" className="text-2xl leading-none shrink-0" />
                    </div>
                    <div>
                      <p className="text-xs opacity-80">CARD INSURANCE</p>
                      <p className="font-headline text-xl font-semibold mt-1">
                        ₹{totalCardCoverage.toLocaleString("en-IN")}L{" "}
                        <span className="text-xs font-normal opacity-80">Value</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-2/3">
                  <h3 className="font-headline text-xl font-semibold text-primary mb-2">
                    Card Insurance Discovered
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
              <div className="flex flex-col md:flex-row gap-5 items-start">
                <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Icon name="credit_card" className="text-2xl leading-none" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-headline text-xl font-semibold text-primary mb-1">
                    You may already be insured
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Premium cards bundle in cover that most people never claim, buried in the terms.
                    Name your card and Setu AI digs it out.
                  </p>
                  <ul className="space-y-2">
                    {CARD_UNLOCKS.map((item) => (
                      <li key={item} className="flex gap-2 items-start text-sm text-foreground">
                        <Icon name="check_circle" filled className="text-base leading-none text-secondary shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* Quick Actions Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => {
              const tileClass = cn(
                "rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center min-h-[120px] transition-colors shadow-sm",
                i === 0
                  ? "col-span-2 md:col-span-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  : "bg-card border border-border hover:bg-muted"
              )
              const iconClass = cn(
                "text-3xl leading-none",
                i === 0 ? "" : i === 3 ? "text-destructive" : "text-primary"
              )
              const body = (
                <>
                  <Icon
                    name={uploading && "action" in action ? "progress_activity" : action.icon}
                    className={cn(iconClass, uploading && "action" in action && "animate-spin")}
                  />
                  <span className="text-sm font-semibold leading-tight">{action.label}</span>
                  <span
                    className={cn(
                      "text-xs leading-tight",
                      i === 0 ? "text-secondary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {action.sub}
                  </span>
                </>
              )

              return "action" in action ? (
                <button
                  key={action.label}
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className={tileClass}
                >
                  {body}
                </button>
              ) : (
                <Link key={action.label} href={action.href} className={tileClass}>
                  {body}
                </Link>
              )
            })}
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handlePickedFile(file)
          e.target.value = ""
        }}
      />

      <ProfileSetupDialog
        open={setupOpen}
        profileId={profileId}
        onComplete={() => {
          setSetupOpen(false)
          loadData()
        }}
      />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import type { UserPolicy } from "@/lib/firestore-types"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const CLAIM_TYPES = [
  "Health / Hospitalization",
  "Pre-authorization / Cashless Denial",
  "Maternity",
  "Critical Illness",
  "Accidental Hospitalization",
  "Pre-existing Disease",
  "Domiciliary Treatment",
  "Day-care Procedure",
  "Reimbursement",
  "Life Insurance Death Claim",
  "Motor Insurance",
  "Travel Insurance",
  "Other"
]

interface ClaimResult {
  verdict: "contestable" | "valid"
  confidence: "high" | "medium" | "low"
  summary: string
  reasoning: string
  keyArguments: string[]
  irdaiReferences: Array<{ regulation: string; description: string }>
  nextSteps: string[]
  grievanceLetter: string
}

const selectClass =
  "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export default function ClaimsPage() {
  const [policies, setPolicies] = useState<UserPolicy[]>([])
  const [selectedPolicyId, setSelectedPolicyId] = useState("")
  const [claimType, setClaimType] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ClaimResult | null>(null)
  const [showLetter, setShowLetter] = useState(false)

  useEffect(() => {
    fetch("/api/policies").then((r) => r.json()).then((res) => {
      const ready = res.data.filter((p: UserPolicy) => p.status === "ready")
      setPolicies(ready)
    }).catch(() => {})
  }, [])

  function getPolicyContext(): string {
    if (!selectedPolicyId) return ""
    const policy = policies.find((p) => p.id === selectedPolicyId)
    if (!policy?.parsedCoverage) return ""
    try {
      const parsed = JSON.parse(policy.parsedCoverage)
      return `Insurer: ${parsed.insurer}
Policy Type: ${parsed.policyType}
Sum Insured: ₹${parsed.sumInsured} Lakhs
Exclusions: ${parsed.exclusions?.join(", ") || "None listed"}
Waiting Periods: ${parsed.waitingPeriods?.map((w: { condition: string; period: string }) => `${w.condition} - ${w.period}`).join(", ") || "None"}
Co-pay: ${parsed.coPay || 0}%
Key Highlights: ${parsed.keyHighlights?.join("; ") || "N/A"}`
    } catch {
      return ""
    }
  }

  async function handleAnalyze() {
    if (!claimType || !rejectionReason.trim()) return
    setLoading(true)
    setResult(null)
    setShowLetter(false)

    try {
      const response = await fetch("/api/claim-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimType,
          rejectionReason: rejectionReason.trim(),
          policyContext: getPolicyContext()
        })
      })

      if (!response.ok) throw new Error("Analysis failed")
      const data = await response.json()
      setResult(data)
    } catch {
      setResult(null)
      alert("Analysis failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function downloadLetter() {
    if (!result?.grievanceLetter) return
    const blob = new Blob([result.grievanceLetter], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "grievance-letter.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const verdictInfo = result
    ? result.verdict === "contestable"
      ? {
          badge: "bg-secondary/10 text-secondary border-secondary/20",
          icon: "gavel",
          label: "Rejection is Contestable"
        }
      : {
          badge: "bg-destructive/10 text-destructive border-destructive/20",
          icon: "cancel",
          label: "Rejection Appears Valid"
        }
    : null

  const confidenceBadge: Record<ClaimResult["confidence"], string> = {
    high: "bg-secondary/10 text-secondary border-secondary/20",
    medium: "bg-primary/10 text-primary border-primary/20",
    low: "bg-muted text-muted-foreground border-border"
  }

  return (
    <div className="p-6 md:p-12 max-w-[1280px] mx-auto">
      {/* Page Header */}
      <header className="mb-10 max-w-3xl">
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4 tracking-tight">
          Claim Fighter
        </h1>
        <p className="text-lg text-muted-foreground">
          Don&apos;t let an unfair rejection stand. Describe your denial, and our Setu AI will
          cross-reference it against the latest IRDAI guidelines to build a strong grievance case.
        </p>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Claim Details Form (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-xl text-primary">Claim Details</h2>
              <Icon name="edit_note" className="text-muted-foreground text-xl leading-none" />
            </div>

            <div className="space-y-4">
              {/* Policy selector */}
              <div className="space-y-1.5">
                <Label>Policy (optional)</Label>
                <select
                  className={selectClass}
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                >
                  <option value="">No policy selected (general analysis)</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.insurer || p.fileName}
                    </option>
                  ))}
                </select>
                {policies.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Upload and parse a policy for more accurate analysis
                  </p>
                )}
              </div>

              {/* Claim type */}
              <div className="space-y-1.5">
                <Label>Claim Type</Label>
                <select
                  className={selectClass}
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value)}
                >
                  <option value="">Select claim type</option>
                  {CLAIM_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Rejection reason */}
              <div className="space-y-1.5">
                <Label>Rejection Reason</Label>
                <textarea
                  className="flex min-h-[140px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Paste the rejection reason from your insurer's letter or describe what they told you..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <Button
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold h-11 rounded-lg"
                onClick={handleAnalyze}
                disabled={!claimType || !rejectionReason.trim() || loading}
              >
                {loading ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin text-lg leading-none" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Icon name="gavel" className="text-lg leading-none" />
                    Analyze Claim
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Info card */}
          <div className="bg-accent/40 border border-accent rounded-xl p-4 flex gap-3">
            <Icon name="info" className="text-accent-foreground text-xl leading-none shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-accent-foreground">About this tool</p>
              <p className="text-xs text-accent-foreground/80 mt-1 leading-relaxed">
                Our AI analyzes your claim rejection against IRDAI regulations and your policy
                terms. This is informational guidance — consult a licensed advisor for legal
                decisions.
              </p>
            </div>
          </div>
        </div>

        {/* AI Analysis (8 cols) */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="bg-muted border-b border-border p-4 px-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                <Icon name="memory" className="text-[18px] leading-none" />
              </div>
              <h3 className="text-sm font-semibold text-primary tracking-wide">AI CLAIM ANALYSIS</h3>
            </div>
            {verdictInfo && (
              <span className={cn(
                "font-semibold text-xs px-3 py-1 rounded-full border flex items-center gap-1",
                verdictInfo.badge
              )}>
                <Icon name={verdictInfo.icon} className="text-sm leading-none" />
                {verdictInfo.label}
              </span>
            )}
          </div>

          <div className="p-6 flex-1 flex flex-col">
            {!result && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-10">
                <Icon name="fact_check" className="text-4xl leading-none mb-3 text-border" />
                <p className="text-sm font-medium">Analysis will appear here</p>
                <p className="text-xs mt-1">Fill in the claim details and click Analyze</p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                <Icon name="progress_activity" className="animate-spin text-4xl leading-none mb-3 text-secondary" />
                <p className="text-sm font-medium text-foreground">Analyzing your claim...</p>
                <p className="text-xs text-muted-foreground mt-1">Checking against IRDAI regulations</p>
              </div>
            )}

            {result && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: user's rejection reason */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">
                    Your Rejection Reason
                  </p>
                  <div className="p-4 bg-background border border-border rounded-lg relative">
                    <Icon
                      name="format_quote"
                      className="absolute -top-3 -left-3 text-border bg-background rounded-full p-1 text-xl leading-none"
                    />
                    <p className="text-sm text-muted-foreground italic">&ldquo;{rejectionReason}&rdquo;</p>
                  </div>
                  <span className={cn(
                    "inline-flex mt-4 text-xs font-semibold px-2.5 py-1 rounded-full border",
                    confidenceBadge[result.confidence]
                  )}>
                    {result.confidence} confidence
                  </span>
                </div>

                {/* Right: Setu analysis */}
                <div className="relative">
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-secondary rounded-full" />
                  <div className="pl-6">
                    <p className="text-xs text-secondary uppercase tracking-wider mb-3 flex items-center gap-2 font-semibold">
                      <Icon name="gavel" className="text-base leading-none" />
                      Setu IRDAI Analysis
                    </p>
                    <h4 className="font-headline text-lg text-primary mb-2">{verdictInfo?.label}</h4>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{result.summary}</p>
                    <div className="bg-muted p-3 rounded-md border border-border flex items-start gap-3">
                      <Icon name="check_circle" className="text-primary mt-0.5 text-xl leading-none shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-primary">Recommendation</p>
                        <p className="text-xs text-muted-foreground">
                          {result.nextSteps?.[0] || result.reasoning}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {result && (
          <>
            {/* Your Case: reasoning, key arguments, IRDAI references, next steps (8 cols) */}
            <div className="lg:col-span-8 bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-headline text-xl text-primary">Your Case</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Detailed reasoning, arguments, and regulations backing your grievance.
                </p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-8">{result.reasoning}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Key Arguments */}
                {result.keyArguments?.length > 0 && (
                  <div>
                    <p className="text-xs text-primary uppercase tracking-wider mb-3 font-semibold flex items-center gap-2">
                      <Icon name="checklist" className="text-base leading-none" />
                      Key Arguments
                    </p>
                    <ul className="space-y-2.5">
                      {result.keyArguments.map((arg, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Icon name="arrow_forward" className="text-secondary text-sm leading-none mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{arg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* IRDAI References */}
                {result.irdaiReferences?.length > 0 && (
                  <div>
                    <p className="text-xs text-primary uppercase tracking-wider mb-3 font-semibold flex items-center gap-2">
                      <Icon name="menu_book" className="text-base leading-none" />
                      IRDAI References
                    </p>
                    <div className="space-y-3">
                      {result.irdaiReferences.map((ref, i) => (
                        <div key={i} className="bg-muted rounded-lg px-3 py-2.5 border border-border/50">
                          <p className="text-xs font-semibold text-primary">{ref.regulation}</p>
                          <p className="text-xs text-muted-foreground mt-1">{ref.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Next Steps */}
              {result.nextSteps?.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border">
                  <p className="text-xs text-primary uppercase tracking-wider mb-3 font-semibold flex items-center gap-2">
                    <Icon name="checklist_rtl" className="text-base leading-none" />
                    Recommended Next Steps
                  </p>
                  <ol className="space-y-2.5">
                    {result.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Grievance Letter Draft (4 cols) */}
            {result.grievanceLetter && (
              <div className="lg:col-span-4 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "16px 16px", color: "hsl(var(--primary))" }} />
                <div className="p-6 flex-1 relative z-10 flex flex-col">
                  <div className="bg-secondary/10 text-secondary w-12 h-12 rounded-lg flex items-center justify-center border border-secondary/20 mb-4">
                    <Icon name="draft" className="text-2xl leading-none" />
                  </div>
                  <h3 className="font-headline text-lg text-primary mb-2">Grievance Draft Ready</h3>

                  {showLetter ? (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-background rounded-lg p-3 border border-border max-h-64 overflow-y-auto mb-4">
                      {result.grievanceLetter}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-3 relative">
                      {result.grievanceLetter}
                    </p>
                  )}

                  <div className="mt-auto pt-6 border-t border-border flex flex-col gap-3">
                    <Button
                      className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold py-3 h-auto rounded-lg"
                      onClick={downloadLetter}
                    >
                      <Icon name="download" className="text-lg leading-none" />
                      Download Letter
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-2 border-primary text-primary font-bold hover:bg-primary/5 rounded-lg h-auto py-2.5"
                      onClick={() => setShowLetter((v) => !v)}
                    >
                      <Icon name={showLetter ? "expand_less" : "expand_more"} className="text-lg leading-none" />
                      {showLetter ? "Hide Draft" : "Preview Draft"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

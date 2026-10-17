"use client"

import { useState, useEffect, useRef } from "react"
import type { UserPolicy, UserCard } from "@/lib/firestore-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import PolicyCoverageCard from "@/components/dashboard/PolicyCoverageCard"
import HiddenCoverageCard from "@/components/dashboard/HiddenCoverageCard"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/use-toast"

const POPULAR_CARDS = [
  "HDFC Regalia", "HDFC Infinia", "SBI Elite", "ICICI Sapphiro", "Axis Magnus", "Amex Platinum"
]

function getStatusIcon(status: string) {
  if (status === "ready") return <Icon name="check_circle" filled className="text-base text-secondary leading-none" />
  if (status === "error") return <Icon name="error" filled className="text-base text-destructive leading-none" />
  return <Icon name="progress_activity" className="text-base text-primary leading-none animate-spin" />
}

function getStatusColor(status: string) {
  if (status === "ready") return "bg-accent text-accent-foreground border-transparent"
  if (status === "error") return "bg-destructive/10 text-destructive border-destructive/20"
  return "bg-muted text-primary border-transparent"
}

export default function PoliciesPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Insurance Policies state ---
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [policies, setPolicies] = useState<UserPolicy[]>([])
  const [selectedPolicy, setSelectedPolicy] = useState<UserPolicy | null>(null)
  const [pollingId, setPollingId] = useState<string | null>(null)

  // --- Card Coverage state ---
  const [query, setQuery] = useState("")
  const [cardLoading, setCardLoading] = useState(false)
  const [cardResult, setCardResult] = useState<Record<string, unknown> | null>(null)
  const [savedCards, setSavedCards] = useState<UserCard[]>([])
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null)

  useEffect(() => {
    loadPolicies()
    loadSavedCards()
  }, [])

  // Poll for policy parsing status updates
  useEffect(() => {
    if (!pollingId) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/policies/${pollingId}`).then((r) => r.json())
      if (res.data?.status === "ready" || res.data?.status === "error") {
        clearInterval(interval)
        setPollingId(null)
        loadPolicies()
        if (res.data.status === "ready") {
          toast({ title: "Policy parsed!", description: "Your coverage details are ready." })
        } else {
          toast({ title: "Parsing failed", description: "Could not parse the policy.", variant: "destructive" })
        }
      }
    }, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingId])

  async function loadPolicies() {
    const res = await fetch("/api/policies").then((r) => r.json())
    setPolicies(res.data)
  }

  async function loadSavedCards() {
    const res = await fetch("/api/cards").then((r) => r.json())
    setSavedCards(res.data)
  }

  async function handleFileUpload(file: File) {
    if (!file || file.type !== "application/pdf") {
      toast({ title: "Please upload a PDF file", variant: "destructive" })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB allowed", variant: "destructive" })
      return
    }

    setUploading(true)
    setUploadProgress(20)

    try {
      const formData = new FormData()
      formData.append("file", file)

      setUploadProgress(50)
      const res = await fetch("/api/policies", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const { data: policy } = await res.json()

      setUploadProgress(100)
      setPollingId(policy.id)
      loadPolicies()
      toast({ title: "Upload complete!", description: "Parsing your policy with AI..." })
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  async function handleDeletePolicy(id: string) {
    await fetch(`/api/policies?id=${id}`, { method: "DELETE" })
    setPolicies((prev) => prev.filter((p) => p.id !== id))
    if (selectedPolicy?.id === id) setSelectedPolicy(null)
    toast({ title: "Policy removed" })
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setCardLoading(true)
    setCardResult(null)
    try {
      const response = await fetch("/api/card-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardName: query })
      })
      if (!response.ok) throw new Error("Discovery failed")
      const data = await response.json()
      setCardResult(data)
    } catch {
      toast({ title: "Card discovery failed", description: "Please try again.", variant: "destructive" })
    } finally {
      setCardLoading(false)
    }
  }

  async function handleSaveCard() {
    if (!cardResult) return
    try {
      const coverage = cardResult as { cardName: string; bankName: string; cardType: string; totalHiddenValue: number }
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName: coverage.cardName,
          bankName: coverage.bankName,
          cardType: coverage.cardType,
          coverageData: JSON.stringify(cardResult),
          hiddenValue: coverage.totalHiddenValue
        })
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Card saved!", description: `${coverage.cardName} added to your portfolio.` })
      setCardResult(null)
      setQuery("")
      loadSavedCards()
    } catch {
      toast({ title: "Failed to save card", variant: "destructive" })
    }
  }

  async function handleDeleteCard(id: string) {
    await fetch(`/api/cards?id=${id}`, { method: "DELETE" })
    setSavedCards((prev) => prev.filter((c) => c.id !== id))
    if (selectedCard?.id === id) setSelectedCard(null)
    toast({ title: "Card removed" })
  }

  const totalHiddenValue = savedCards.reduce((sum, c) => sum + (c.hiddenValue || 0), 0)

  return (
    <div className="p-6 md:p-margin-desktop max-w-container-max mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-headline font-bold text-3xl text-primary">My Policies</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Manage your active insurance policies and complementary credit card coverages in one unified dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Insurance Policies column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-semibold text-xl text-primary flex items-center gap-2">
              <Icon name="health_and_safety" className="text-secondary text-xl leading-none" />
              Insurance Policies
            </h2>
            {policies.length > 0 && (
              <span className="bg-muted text-primary px-3 py-1 rounded-full text-xs font-semibold">
                {policies.length} {policies.length === 1 ? "Policy" : "Policies"}
              </span>
            )}
          </div>

          {/* Upload Zone */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-headline">Upload Insurance Policy</CardTitle>
              <CardDescription>PDF format only · Max 10MB · Health, Life, Term, or Motor policies</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                  dragging ? "border-secondary bg-accent/20" : "border-border hover:border-secondary/50 hover:bg-muted"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Icon name="upload_file" className="text-2xl text-primary leading-none" />
                </div>
                <p className="text-foreground font-medium mb-1">Drop your policy PDF here or click to browse</p>
                <p className="text-sm text-muted-foreground">Supports: Health, Life, Term, Motor, Travel policies</p>
              </div>

              {uploading && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>{uploadProgress < 70 ? "Uploading..." : uploadProgress < 100 ? "Processing..." : "Complete!"}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Policies List */}
          {policies.length > 0 ? (
            <div className="space-y-3">
              {policies.map((policy) => (
                <Card
                  key={policy.id}
                  className={`cursor-pointer transition-all border-border ${
                    selectedPolicy?.id === policy.id ? "ring-2 ring-secondary" : "hover:shadow-md hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedPolicy(selectedPolicy?.id === policy.id ? null : policy)}
                >
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Icon name="description" className="text-lg text-secondary leading-none" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[220px]">{policy.fileName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{policy.insurer || "Parsing..."}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePolicy(policy.id) }}
                        className="text-muted-foreground/50 hover:text-destructive transition-colors ml-2"
                      >
                        <Icon name="delete" className="text-lg leading-none" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {getStatusIcon(policy.status || "")}
                      <Badge className={`${getStatusColor(policy.status || "")} text-xs`}>
                        {policy.status || "uploading"}
                      </Badge>
                      {policy.status === "parsing" && (
                        <span className="text-xs text-muted-foreground">AI parsing in progress...</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Expanded Policy View */}
              {selectedPolicy && selectedPolicy.parsedCoverage && selectedPolicy.status === "ready" && (
                <div className="pt-2">
                  <h3 className="font-headline font-semibold text-primary mb-4">
                    {selectedPolicy.fileName} — Coverage Analysis
                  </h3>
                  <PolicyCoverageCard
                    data={JSON.parse(selectedPolicy.parsedCoverage)}
                    fileName={selectedPolicy.fileName}
                  />
                </div>
              )}

              {selectedPolicy && selectedPolicy.status === "parsing" && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Icon name="progress_activity" className="text-4xl text-secondary leading-none animate-spin mx-auto mb-3" />
                    <p className="text-foreground font-medium">Parsing policy with AI...</p>
                    <p className="text-sm text-muted-foreground mt-1">This may take up to 60 seconds</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            !uploading && (
              <Card className="border-border shadow-sm">
                <CardContent className="flex flex-col items-center justify-center text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Icon name="description" className="text-3xl text-muted-foreground leading-none" />
                  </div>
                  <h3 className="font-headline font-semibold text-primary mb-2">No policies added</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Keep all your health and life insurance documents in one secure place. Upload now for instant AI analysis.
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Card Coverage column */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="font-headline font-semibold text-xl text-primary flex items-center gap-2">
            <Icon name="credit_card" className="text-secondary text-xl leading-none" />
            Card Coverage
          </h2>

          {/* Aggregate summary */}
          {savedCards.length > 0 && (
            <div className="bg-primary text-primary-foreground rounded-xl p-6 shadow-md relative overflow-hidden">
              <Icon name="account_balance" className="absolute -right-4 -top-4 text-[100px] leading-none opacity-10" />
              <div className="relative z-10">
                <p className="text-xs opacity-80 mb-1">Total Hidden Coverage</p>
                <p className="font-headline font-bold text-3xl mb-2">₹{totalHiddenValue.toLocaleString("en-IN")}L</p>
                <p className="text-sm opacity-80">Unlocked through your credit cards, tracked by BimaSetu.</p>
              </div>
            </div>
          )}

          {/* Card search */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-headline">Discover Hidden Coverage</CardTitle>
              <CardDescription>Enter a credit card name to reveal its insurance benefits</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex flex-col gap-3">
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground leading-none" />
                  <Input
                    placeholder="e.g. HDFC Regalia"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" disabled={cardLoading || !query.trim()} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  {cardLoading ? <Icon name="progress_activity" className="text-lg leading-none animate-spin" /> : "Discover"}
                </Button>
              </form>
              <div className="flex flex-wrap gap-2 mt-3">
                {POPULAR_CARDS.map((card) => (
                  <button
                    key={card}
                    onClick={() => setQuery(card)}
                    className="text-xs px-3 py-1 rounded-full border border-border bg-background text-primary hover:bg-muted transition-colors"
                  >
                    {card}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {cardLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="text-center">
                <Icon name="progress_activity" className="text-3xl text-secondary leading-none animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Analyzing card benefits with AI...</p>
              </div>
            </div>
          )}

          {cardResult && !cardLoading && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">Coverage Found!</h3>
                <Button size="sm" onClick={handleSaveCard} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  Save to My Cards
                </Button>
              </div>
              <HiddenCoverageCard data={cardResult as unknown as Parameters<typeof HiddenCoverageCard>[0]["data"]} />
            </div>
          )}

          {/* Saved cards */}
          {savedCards.length > 0 ? (
            <div className="space-y-3">
              {savedCards.map((card) => {
                const coverage = card.coverageData ? JSON.parse(card.coverageData) : null
                return (
                  <Card
                    key={card.id}
                    className={`cursor-pointer transition-all border-border ${
                      selectedCard?.id === card.id ? "ring-2 ring-secondary" : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                  >
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                            <Icon name="credit_card" className="text-base leading-none" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{card.cardName}</p>
                            <p className="text-xs text-muted-foreground">{coverage?.bankName || card.bankName}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id) }}
                          className="text-muted-foreground/50 hover:text-destructive transition-colors"
                        >
                          <Icon name="delete" className="text-lg leading-none" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Hidden value</span>
                        <Badge className="bg-accent text-accent-foreground border-transparent">
                          ₹{(card.hiddenValue || 0).toLocaleString("en-IN")}L
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {selectedCard && selectedCard.coverageData && (
                <div className="pt-2">
                  <h3 className="font-headline font-semibold text-primary mb-4">{selectedCard.cardName} — Full Details</h3>
                  <HiddenCoverageCard
                    data={JSON.parse(selectedCard.coverageData) as Parameters<typeof HiddenCoverageCard>[0]["data"]}
                  />
                </div>
              )}
            </div>
          ) : (
            !cardResult && !cardLoading && (
              <Card className="border-border shadow-sm">
                <CardContent className="flex flex-col items-center justify-center text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Icon name="add_card" className="text-2xl text-muted-foreground leading-none" />
                  </div>
                  <h3 className="font-headline font-semibold text-primary mb-1 text-sm">No cards linked</h3>
                  <p className="text-xs text-muted-foreground">
                    Discover hidden insurance benefits on your credit cards using the search above.
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  )
}

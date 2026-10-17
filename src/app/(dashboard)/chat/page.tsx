"use client"

import { useEffect, useState } from "react"
import ChatInterface from "@/components/chat/ChatInterface"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import type { UserPolicy, UserCard } from "@/lib/firestore-types"

export default function ChatPage() {
  const [policyContext, setPolicyContext] = useState("")
  const [cardContext, setCardContext] = useState("")
  const [contextLoaded, setContextLoaded] = useState(false)
  const [policyCount, setPolicyCount] = useState(0)
  const [cardCount, setCardCount] = useState(0)

  useEffect(() => {
    async function loadContext() {
      try {
        const [policiesRes, cardsRes]: [{ data: UserPolicy[] }, { data: UserCard[] }] = await Promise.all([
          fetch("/api/policies").then((r) => r.json()),
          fetch("/api/cards").then((r) => r.json())
        ])

        // Build policy context
        const readyPolicies = policiesRes.data.filter((p) => p.status === "ready" && p.parsedCoverage)
        setPolicyCount(readyPolicies.length)

        if (readyPolicies.length > 0) {
          const policyContextStr = readyPolicies
            .slice(0, 3)
            .map((p) => {
              const parsed = JSON.parse(p.parsedCoverage || "{}")
              return `POLICY: ${p.fileName} (${p.insurer})
Sum Insured: ₹${parsed.sumInsured}L
Covered: ${parsed.coveredProcedures?.slice(0, 5).map((c: { name: string }) => c.name).join(", ")}
Exclusions: ${parsed.exclusions?.slice(0, 5).join(", ")}
Waiting Periods: ${parsed.waitingPeriods?.map((w: { condition: string; period: string }) => `${w.condition}: ${w.period}`).join(", ")}`
            })
            .join("\n\n")
          setPolicyContext(policyContextStr)
        }

        // Build card context
        setCardCount(cardsRes.data.length)

        if (cardsRes.data.length > 0) {
          const cardContextStr = cardsRes.data
            .slice(0, 5)
            .map((c) => {
              const coverage = c.coverageData ? JSON.parse(c.coverageData) : {}
              return `CARD: ${c.cardName} (${coverage.bankName})
Air Accident: ₹${coverage.airAccident?.amount}L
Personal Accident: ₹${coverage.personalAccident?.amount}L
Travel Insurance: ₹${coverage.travelInsurance?.amount}L
Emergency Medical: ₹${coverage.emergencyMedical?.amount}L
Total Hidden: ₹${c.hiddenValue}L`
            })
            .join("\n\n")
          setCardContext(cardContextStr)
        }
      } catch {
        // Context not available
      } finally {
        setContextLoaded(true)
      }
    }

    loadContext()
  }, [])

  if (!contextLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon name="progress_activity" className="text-4xl leading-none text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Chat Header */}
      <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
            <Icon name="smart_toy" className="text-xl leading-none" />
          </div>
          <div>
            <h1 className="font-headline text-lg font-bold text-primary">Setu AI</h1>
            <p className="text-xs text-secondary flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Online
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${policyCount > 0 ? "border-secondary/30 bg-accent/40 text-accent-foreground" : "border-border text-muted-foreground"}`}
          >
            <Icon name="description" className="text-sm leading-none mr-1" />
            {policyCount} {policyCount === 1 ? "policy" : "policies"}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${cardCount > 0 ? "border-primary/30 bg-muted text-primary" : "border-border text-muted-foreground"}`}
          >
            <Icon name="credit_card" className="text-sm leading-none mr-1" />
            {cardCount} {cardCount === 1 ? "card" : "cards"}
          </Badge>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden bg-background">
        <ChatInterface policyContext={policyContext} cardContext={cardContext} />
      </div>
    </div>
  )
}

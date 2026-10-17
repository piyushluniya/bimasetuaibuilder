"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import ChatInterface from "./ChatInterface"
import type { UserPolicy, UserCard } from "@/lib/firestore-types"

export default function FloatingChatWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [policyContext, setPolicyContext] = useState("")
  const [cardContext, setCardContext] = useState("")
  const [contextLoaded, setContextLoaded] = useState(false)
  const loadedRef = useRef(false)

  // Hide on the full chat page
  if (pathname === "/chat") return null

  async function loadContext() {
    if (loadedRef.current) return
    loadedRef.current = true

    try {
      const [policiesRes, cardsRes]: [{ data: UserPolicy[] }, { data: UserCard[] }] = await Promise.all([
        fetch("/api/policies").then((r) => r.json()),
        fetch("/api/cards").then((r) => r.json())
      ])

      const readyPolicies = policiesRes.data.filter((p) => p.status === "ready" && p.parsedCoverage)
      if (readyPolicies.length > 0) {
        const parsed = JSON.parse(readyPolicies[0].parsedCoverage!)
        setPolicyContext(
          `Insurer: ${parsed.insurer}, Type: ${parsed.policyType}, Sum Insured: ₹${parsed.sumInsured}L, ` +
          `Exclusions: ${parsed.exclusions?.slice(0, 3).join(", ") || "N/A"}`
        )
      }

      if (cardsRes.data.length > 0) {
        const cardSummaries = cardsRes.data.map((c) => {
          try {
            const cov = JSON.parse(c.coverageData || "{}")
            return `${c.cardName} (₹${c.hiddenValue || 0}L coverage)`
          } catch {
            return c.cardName
          }
        })
        setCardContext(cardSummaries.join(", "))
      }
    } catch {
      // Context not critical
    } finally {
      setContextLoaded(true)
    }
  }

  function handleOpen() {
    setIsOpen(true)
    loadContext()
  }

  return (
    <>
      {/* Floating button — "Unified Setu" AI chat FAB */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 w-14 h-14 bg-secondary text-secondary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Open Setu AI chat"
        >
          <Icon name="smart_toy" filled className="text-2xl leading-none" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Icon name="smart_toy" className="text-lg leading-none" />
              <span className="font-semibold text-sm font-headline">Setu AI</span>
              {!contextLoaded && (
                <span className="text-xs opacity-70">Loading context...</span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              aria-label="Close chat"
            >
              <Icon name="close" className="text-lg leading-none" />
            </button>
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              policyContext={policyContext}
              cardContext={cardContext}
            />
          </div>
        </div>
      )}
    </>
  )
}

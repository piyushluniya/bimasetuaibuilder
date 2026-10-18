"use client"

import { useCallback, useEffect, useState } from "react"
import ChatInterface from "@/components/chat/ChatInterface"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import type { UserPolicy, UserCard, ChatMessage } from "@/lib/firestore-types"

type ConversationSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

function relativeDay(iso: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ""
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const days = Math.floor((startOfToday.getTime() - then.getTime()) / 86_400_000)
  if (days < 0) return "Today"
  if (days === 0) return "Yesterday"
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export default function ChatPage() {
  const [policyContext, setPolicyContext] = useState("")
  const [cardContext, setCardContext] = useState("")
  const [contextLoaded, setContextLoaded] = useState(false)
  const [policyCount, setPolicyCount] = useState(0)
  const [cardCount, setCardCount] = useState(0)

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeMessages, setActiveMessages] = useState<ChatMessage[] | undefined>(undefined)
  // Remounts ChatInterface only when the user deliberately switches threads —
  // not when a brand-new thread gets its id assigned mid-conversation.
  const [sessionKey, setSessionKey] = useState("new")
  const [historyOpen, setHistoryOpen] = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations").then((r) => r.json())
      setConversations(res.data ?? [])
    } catch {
      // History unavailable — chatting still works
    }
  }, [])

  useEffect(() => {
    async function loadContext() {
      try {
        const [policiesRes, cardsRes]: [{ data: UserPolicy[] }, { data: UserCard[] }] = await Promise.all([
          fetch("/api/policies").then((r) => r.json()),
          fetch("/api/cards").then((r) => r.json())
        ])

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
Total card insurance: ₹${c.hiddenValue}L`
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
    loadConversations()
  }, [loadConversations])

  async function handleMessagesChange(messages: ChatMessage[]) {
    try {
      if (activeId) {
        await fetch(`/api/conversations/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages })
        })
      } else {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages })
        }).then((r) => r.json())
        if (res.data?.id) setActiveId(res.data.id)
      }
      loadConversations()
    } catch {
      // Persisting failed — the on-screen conversation is unaffected
    }
  }

  async function openConversation(id: string) {
    setHistoryOpen(false)
    if (id === activeId) return
    try {
      const res = await fetch(`/api/conversations/${id}`).then((r) => r.json())
      if (!res.data) return
      setActiveMessages(res.data.messages ?? [])
      setActiveId(id)
      setSessionKey(id)
    } catch {
      // Couldn't open — leave the current thread in place
    }
  }

  async function deleteConversation(id: string) {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" })
      if (id === activeId) startNewChat()
      loadConversations()
    } catch {
      // Ignore — the list refreshes on next load
    }
  }

  function startNewChat() {
    setHistoryOpen(false)
    setActiveId(null)
    setActiveMessages(undefined)
    setSessionKey(`new-${Date.now()}`)
  }

  if (!contextLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon name="progress_activity" className="text-4xl leading-none text-primary animate-spin" />
      </div>
    )
  }

  const historyPanel = (
    <>
      <div className="p-4 border-b border-border">
        <Button onClick={startNewChat} className="w-full gap-2">
          <Icon name="add" className="text-lg leading-none" />
          New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Recent Conversations
        </h3>
        {conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Your past conversations will appear here.
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.id} className="group relative">
                <button
                  onClick={() => openConversation(c.id)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-2 pr-8 transition-colors",
                    c.id === activeId ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  )}
                >
                  <span className="block text-sm font-medium truncate">{c.title}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {relativeDay(c.updatedAt)}
                  </span>
                </button>
                <button
                  onClick={() => deleteConversation(c.id)}
                  aria-label={`Delete conversation ${c.title}`}
                  className="absolute right-2 top-2 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-destructive transition-opacity"
                >
                  <Icon name="delete" className="text-base leading-none" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-screen max-h-screen">
      {/* Conversation history */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card flex-shrink-0">
        {historyPanel}
      </aside>

      {/* Mobile history drawer */}
      {historyOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[80%] bg-card flex flex-col shadow-xl">{historyPanel}</div>
          <button
            aria-label="Close conversation history"
            className="flex-1 bg-foreground/30"
            onClick={() => setHistoryOpen(false)}
          />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* Chat Header */}
        <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              aria-label="Conversation history"
              onClick={() => setHistoryOpen(true)}
            >
              <Icon name="menu" className="text-xl leading-none" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
              <Icon name="smart_toy" className="text-xl leading-none" />
            </div>
            <div className="min-w-0">
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
          <ChatInterface
            key={sessionKey}
            policyContext={policyContext}
            cardContext={cardContext}
            initialMessages={activeMessages}
            onMessagesChange={handleMessagesChange}
          />
        </div>
      </div>
    </div>
  )
}

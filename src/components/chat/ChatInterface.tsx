"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

import type { ChatMessage } from "@/lib/firestore-types"

interface Props {
  policyContext: string
  cardContext: string
  initialMessages?: ChatMessage[]
  // Called after each completed exchange so the parent can persist the thread.
  onMessagesChange?: (messages: ChatMessage[]) => void
}

const SUGGESTED_QUESTIONS = [
  "Is knee replacement surgery covered?",
  "What is my ICU room rent limit?",
  "How do I file a cashless claim?",
  "What are the documents needed for a claim?",
  "Is my card's air accident cover active?",
  "What is the waiting period for heart surgery?"
]

export default function ChatInterface({
  policyContext,
  cardContext,
  initialMessages,
  onMessagesChange
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages?.length
      ? initialMessages
      : [
          {
            role: "assistant",
            content: `Hello! I'm BimaSetu AI. I can answer questions about your insurance coverage.

${policyContext ? "I can see your uploaded policy. " : "You haven't uploaded a policy yet — upload one for personalized answers. "}${cardContext ? "Your credit card benefits are also available." : ""}

What would you like to know about your coverage?`,
            timestamp: new Date().toISOString()
          }
        ]
  )
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend(question?: string) {
    const text = question || input.trim()
    if (!text || loading) return

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    }

    const withUser = [...messages, userMessage]
    setMessages(withUser)
    setInput("")
    setLoading(true)

    try {
      const recentMessages = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
      // Bedrock requires conversation to start with a user message — drop any leading assistant messages
      const firstUserIdx = recentMessages.findIndex((m) => m.role === "user")
      const history = firstUserIdx >= 0 ? recentMessages.slice(firstUserIdx) : []

      const response = await fetch("/api/coverage-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          policyContext,
          cardContext,
          conversationHistory: history
        })
      })

      if (!response.ok) throw new Error("Chat failed")
      const data = await response.json()

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.answer,
        ...(data.confidence ? { confidence: data.confidence } : {}),
        ...(data.disclaimer ? { disclaimer: data.disclaimer } : {}),
        timestamp: new Date().toISOString()
      }

      const next = [...withUser, assistantMessage]
      setMessages(next)
      onMessagesChange?.(next)
    } catch {
      // The failed exchange isn't persisted — only the thread as it stood before.
      setMessages([
        ...withUser,
        {
          role: "assistant",
          content:
            "I'm sorry, I couldn't process your question. Please try again in a moment.",
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  function getConfidenceMeta(confidence?: "high" | "medium" | "low") {
    if (confidence === "high") return { icon: "verified", className: "text-secondary" }
    if (confidence === "medium") return { icon: "info", className: "text-muted-foreground" }
    return { icon: "help", className: "text-muted-foreground" }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <div key={idx} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] space-y-1 flex flex-col",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.role === "assistant" && message.confidence && (
                <div className={cn("flex items-center gap-1 text-xs font-medium px-1", getConfidenceMeta(message.confidence).className)}>
                  <Icon name={getConfidenceMeta(message.confidence).icon} className="text-sm leading-none" />
                  {message.confidence === "high" ? "High confidence" :
                   message.confidence === "medium" ? "Medium confidence" : "General answer"}
                </div>
              )}

              {message.disclaimer && (
                <div className="flex gap-1.5 items-start bg-muted border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
                  <Icon name="info" className="text-sm leading-none shrink-0 mt-0.5" />
                  {message.disclaimer}
                </div>
              )}

              <p className="text-xs text-muted-foreground px-1">
                {new Date(message.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted text-primary hover:bg-accent/40 transition-colors font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-card flex-shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend() }}
          className="max-w-4xl mx-auto flex items-center gap-2 bg-muted border border-border rounded-2xl p-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your coverage..."
            disabled={loading}
            className="flex-1 h-10 bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="icon"
            className="rounded-full bg-primary text-primary-foreground hover:opacity-90 shrink-0"
          >
            {loading ? (
              <Icon name="progress_activity" className="text-lg leading-none animate-spin" />
            ) : (
              <Icon name="send" className="text-lg leading-none" />
            )}
          </Button>
        </form>
        <p className="max-w-4xl mx-auto text-center text-[11px] text-muted-foreground mt-2">
          Setu AI can make mistakes. Consider verifying important coverage details with your policy document.
        </p>
      </div>
    </div>
  )
}

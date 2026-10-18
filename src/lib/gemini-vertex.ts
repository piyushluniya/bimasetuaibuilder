// Shared Vertex AI helper — replaces direct Gemini Developer API key calls.
// Auth: Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS service account key).

import { GoogleGenAI } from "@google/genai"

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || ""
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us-central1"
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite"

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    if (!PROJECT_ID) {
      console.error("[Vertex AI] FATAL: GOOGLE_CLOUD_PROJECT environment variable is not set")
      throw new Error("GOOGLE_CLOUD_PROJECT is not configured")
    }
    client = new GoogleGenAI({ vertexai: true, project: PROJECT_ID, location: LOCATION })
  }
  return client
}

interface GeminiContent {
  role: "user" | "model"
  parts: Array<{ text: string }>
}

export interface GeminiCallParams {
  prompt?: string
  systemPrompt?: string
  conversationHistory?: Array<{ role: string; content: string }>
  maxTokens?: number
  temperature?: number
  // Constrains the model to emit strict JSON. Without it the response can
  // arrive wrapped in markdown fences or with trailing prose, both of which
  // break JSON.parse.
  json?: boolean
}

export async function callGemini(params: GeminiCallParams): Promise<string> {
  const { prompt, systemPrompt, conversationHistory = [], maxTokens = 1024, temperature = 0.7, json = false } = params

  const contents: GeminiContent[] = []
  for (const msg of conversationHistory) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    })
  }
  if (prompt) {
    contents.push({ role: "user", parts: [{ text: prompt }] })
  }

  console.log(`[Vertex AI] Model: ${MODEL} | Project: ${PROJECT_ID} | Location: ${LOCATION}`)
  console.log(`[Vertex AI] Messages: ${contents.length} | maxTokens: ${maxTokens} | temperature: ${temperature}`)
  console.log(`[Vertex AI] Has system prompt: ${!!systemPrompt}`)

  const startTime = Date.now()

  let response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>
  try {
    response = await getClient().models.generateContent({
      model: MODEL,
      contents,
      config: {
        maxOutputTokens: maxTokens,
        temperature,
        ...(json ? { responseMimeType: "application/json" } : {}),
        ...(systemPrompt ? { systemInstruction: systemPrompt } : {})
      }
    })
  } catch (err) {
    console.error("[Vertex AI] API error:", err)
    throw new Error(`Vertex AI error: ${err instanceof Error ? err.message : String(err)}`)
  }

  const elapsed = Date.now() - startTime
  console.log(`[Vertex AI] Responded in ${elapsed}ms`)

  const text = response.text
  if (!text) {
    console.error("[Vertex AI] Empty response candidates:", JSON.stringify(response))
    throw new Error("Empty response from Vertex AI")
  }

  return text
}

// Call this once at cold start to verify project/location/auth are working
export async function testGeminiConnection(functionName: string): Promise<void> {
  console.log(`[Vertex AI] [${functionName}] Running startup connection test...`)
  try {
    const result = await callGemini({
      prompt: 'Reply with exactly this JSON and nothing else: {"status":"ok","service":"vertex-ai"}',
      maxTokens: 30,
      temperature: 0
    })
    console.log(`[Vertex AI] [${functionName}] Startup test PASSED. Response: ${result.trim()}`)
  } catch (err) {
    console.error(`[Vertex AI] [${functionName}] Startup test FAILED:`, err)
    // Don't throw — caller should still start; the real call will fail with a clear error if needed
  }
}

import { NextRequest, NextResponse } from "next/server"
import { callGemini } from "@/lib/gemini-vertex"

export async function POST(request: NextRequest) {
  try {
    const { question, policyContext, cardContext, conversationHistory } = await request.json()

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 })
    }

    const systemPrompt = `You are BimaSetu AI, an expert insurance assistant helping users understand their insurance coverage.

Your role:
- Help users understand exactly what their policies and credit cards cover
- Answer questions about claims, coverage limits, exclusions, and processes
- Use simple, clear language that any user can understand, free of jargon
- Mirror the user's own language and terminology rather than assuming a region
- Always cite specific clause numbers or policy sections when available
- Be empathetic — insurance queries often arise during stressful situations

IMPORTANT RULES:
1. Never give medical advice — always recommend consulting a doctor
2. For claim amounts, provide the calculated amount based on policy terms
3. If information is not in the provided context, clearly say so
4. Always mention if the coverage requires pre-authorization (cashless) vs reimbursement
5. Highlight any time-sensitive actions the user needs to take

USER'S INSURANCE CONTEXT:
${policyContext ? `--- HEALTH/INSURANCE POLICY ---\n${policyContext}` : "No insurance policy uploaded yet."}

${cardContext ? `--- CREDIT CARD INSURANCE BENEFITS ---\n${cardContext}` : "No credit cards added yet."}`

    let confidence: "high" | "medium" | "low" = "medium"
    if (policyContext && policyContext.length > 100) confidence = "high"
    else if (!policyContext && !cardContext) confidence = "low"

    const answer = await callGemini({ systemPrompt, conversationHistory, prompt: question, maxTokens: 1024, temperature: 0.3 })

    return NextResponse.json({
      answer,
      confidence,
      disclaimer: confidence === "low"
        ? "This answer is based on general knowledge. Upload your policy documents for personalized answers."
        : undefined
    })
  } catch (error) {
    console.error("Coverage QA error:", error)
    return NextResponse.json(
      { error: "Coverage Q&A failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

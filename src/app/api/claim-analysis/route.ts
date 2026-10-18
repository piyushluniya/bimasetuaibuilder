import { NextRequest, NextResponse } from "next/server"
import { callGemini } from "@/lib/gemini-vertex"

export async function POST(req: NextRequest) {
  try {
    const { claimType, rejectionReason, policyContext } = await req.json()

    if (!claimType || !rejectionReason) {
      return NextResponse.json({ error: "claimType and rejectionReason are required" }, { status: 400 })
    }

    const policySection = policyContext
      ? `\n\nPOLICY CONTEXT:\n${policyContext}`
      : "\n\nNo policy document uploaded — provide general guidance based on IRDAI regulations."

    const prompt = `You are an expert Indian insurance claims advisor with deep knowledge of IRDAI (Insurance Regulatory and Development Authority of India) regulations, consumer rights, and insurance jurisprudence.

A policyholder has had their insurance claim rejected. Analyze the rejection and advise whether it is contestable.

CLAIM TYPE: ${claimType}
REJECTION REASON: ${rejectionReason}${policySection}

Analyze this rejection and return a JSON object with this exact structure:
{
  "verdict": "contestable" | "valid",
  "confidence": "high" | "medium" | "low",
  "summary": "<2-3 sentence plain-language verdict explaining the core finding>",
  "reasoning": "<detailed explanation of why the rejection is contestable or valid, citing specific policy terms or regulations>",
  "keyArguments": [
    "<argument 1 in favour of the policyholder>",
    "<argument 2>",
    "<argument 3>"
  ],
  "irdaiReferences": [
    {
      "regulation": "<IRDAI regulation or circular name>",
      "description": "<how this regulation supports the policyholder's case>"
    }
  ],
  "nextSteps": [
    "<step 1: e.g., File a written complaint with insurer's grievance cell>",
    "<step 2: e.g., If unresolved in 30 days, escalate to IRDAI Bima Bharosa portal>",
    "<step 3>"
  ],
  "grievanceLetter": "<full text of a formal grievance letter the policyholder can send to the insurer, ready to use, addressed to 'The Grievance Officer', mentioning IRDAI regulations>"
}

If the rejection is valid (e.g., clear policy exclusion applies), still provide the nextSteps as review options and set verdict to "valid".

Return ONLY the JSON, no markdown, no explanation.`

    let content: string
    try {
      content = await callGemini({ prompt, maxTokens: 8192, temperature: 0.2, json: true })
    } catch (err) {
      console.error("[claim-analysis] Vertex AI error:", err)
      return NextResponse.json({ error: "Vertex AI error" }, { status: 500 })
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("[claim-analysis] No JSON in Gemini response:", content)
      return NextResponse.json({ error: "Failed to parse Gemini response" }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error("[claim-analysis] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

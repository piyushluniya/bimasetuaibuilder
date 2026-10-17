import { NextRequest, NextResponse } from "next/server"
import { findCard } from "@/data/cardKnowledgeBase"
import { callGemini } from "@/lib/gemini-vertex"

export async function POST(request: NextRequest) {
  try {
    const { cardName } = await request.json()
    if (!cardName) return NextResponse.json({ error: "cardName is required" }, { status: 400 })

    const knownData = findCard(cardName)

    const prompt = knownData
      ? `You are an expert Indian insurance analyst. Based on the following known benefits data for the ${knownData.cardName}, generate a detailed Hidden Coverage Card JSON.

Known data:
- Air Accident Cover: ₹${knownData.airAccident} lakhs
- Personal Accident: ₹${knownData.personalAccident} lakhs
- Travel Insurance: ₹${knownData.travelInsurance} lakhs
- Purchase Protection: ₹${knownData.purchaseProtection} lakhs
- Lost Card Liability: ₹${knownData.lostCardLiability} lakhs
- Emergency Medical: ₹${knownData.emergencyMedical} lakhs
- Total Hidden Value: ₹${knownData.totalHiddenValue} lakhs
- Key Alerts: ${knownData.keyAlerts.join(", ")}

Generate a JSON response with this exact structure:
{
  "cardName": "${knownData.cardName}",
  "bankName": "${knownData.bankName}",
  "cardType": "${knownData.cardType}",
  "airAccident": { "amount": <number in lakhs>, "description": "<brief description>", "conditions": ["<condition 1>", "<condition 2>"] },
  "personalAccident": { "amount": <number in lakhs>, "description": "<brief description>", "conditions": ["<condition>"] },
  "travelInsurance": { "amount": <number in lakhs>, "description": "<brief description>", "conditions": ["<condition>"] },
  "purchaseProtection": { "amount": <number in lakhs>, "description": "<brief description>", "conditions": ["<condition>"] },
  "lostCardLiability": { "amount": <number in lakhs>, "description": "<brief description>" },
  "emergencyMedical": { "amount": <number in lakhs>, "description": "<brief description>" },
  "totalHiddenValue": <total in lakhs>,
  "keyAlerts": ["<alert 1>", "<alert 2>", "<alert 3>"],
  "usageTips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}
Return ONLY the JSON, no markdown, no explanation.`
      : `You are an expert Indian insurance analyst. The user is asking about the "${cardName}" credit card.

Based on your knowledge of Indian credit cards and their typical insurance benefits, generate a Hidden Coverage Card JSON for this card. If you don't know the specific card, generate reasonable estimates based on similar cards in the same tier.

Generate a JSON response with this exact structure:
{
  "cardName": "<card name>",
  "bankName": "<bank name>",
  "cardType": "<card type>",
  "airAccident": { "amount": <number in lakhs>, "description": "<brief description>", "conditions": ["<condition 1>", "<condition 2>"] },
  "personalAccident": { "amount": <number in lakhs>, "description": "<brief description>", "conditions": ["<condition>"] },
  "travelInsurance": { "amount": <number in lakhs>, "description": "<brief description>", "conditions": ["<condition>"] },
  "purchaseProtection": { "amount": <number in lakhs>, "description": "<brief description>", "conditions": ["<condition>"] },
  "lostCardLiability": { "amount": <number in lakhs>, "description": "<brief description>" },
  "emergencyMedical": { "amount": <number in lakhs>, "description": "<brief description>" },
  "totalHiddenValue": <total in lakhs>,
  "keyAlerts": ["<alert 1>", "<alert 2>"],
  "usageTips": ["<tip 1>", "<tip 2>"]
}
Return ONLY the JSON, no markdown, no explanation.`

    const content = await callGemini({ prompt, maxTokens: 1024, temperature: 0.3 })
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Failed to extract JSON from Gemini response")
    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("Card discovery error:", error)
    return NextResponse.json(
      { error: "Card discovery failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

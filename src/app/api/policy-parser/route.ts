import { NextRequest, NextResponse } from "next/server"
import { DocumentProcessorServiceClient } from "@google-cloud/documentai"
import { adminDb, requireUserId } from "@/lib/firebase-admin"
import { getBucket } from "@/lib/gcs"
import { callGemini } from "@/lib/gemini-vertex"

// Document AI processors live in "us" or "eu" multi-region locations, not
// standard GCP regions like us-central1 — separate env var on purpose.
const DOCUMENT_AI_LOCATION = process.env.DOCUMENT_AI_LOCATION || "us"
const DOCUMENT_AI_PROCESSOR_ID = process.env.DOCUMENT_AI_PROCESSOR_ID || ""

let docAiClient: DocumentProcessorServiceClient | null = null
function getDocAiClient(): DocumentProcessorServiceClient {
  if (!docAiClient) {
    docAiClient = new DocumentProcessorServiceClient({
      apiEndpoint: `${DOCUMENT_AI_LOCATION}-documentai.googleapis.com`
    })
  }
  return docAiClient
}

interface ParsedCoverage {
  insurer: string
  policyNumber: string
  policyType: string
  sumInsured: number
  deductible: number
  premium: number
  policyPeriod: { from: string; to: string }
  coveredProcedures: Array<{ name: string; limit: number; notes: string }>
  exclusions: string[]
  waitingPeriods: Array<{ condition: string; period: string }>
  roomRentLimit: number
  coPay: number
  networkHospitalCount: number
  riders: string[]
  keyHighlights: string[]
}

// Extracts text via Document AI. NOTE: uses the synchronous processDocument
// call, which most Document AI processors cap around 15-30 pages depending
// on processor type. Textract's original pipeline used async polling because
// it had no such limit — long policy documents may need batchProcessDocuments
// (GCS-to-GCS, async) instead. Flagging for manual testing per the migration
// plan: output shape and page-limit behavior both differ from Textract.
async function extractText(gcsKey: string): Promise<string> {
  const [fileBuffer] = await getBucket().file(gcsKey).download()

  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  if (!projectId) throw new Error("GOOGLE_CLOUD_PROJECT is not configured")
  if (!DOCUMENT_AI_PROCESSOR_ID) throw new Error("DOCUMENT_AI_PROCESSOR_ID is not configured")

  const name = `projects/${projectId}/locations/${DOCUMENT_AI_LOCATION}/processors/${DOCUMENT_AI_PROCESSOR_ID}`

  const [result] = await getDocAiClient().processDocument({
    name,
    rawDocument: {
      content: fileBuffer.toString("base64"),
      mimeType: "application/pdf"
    }
  })

  return result.document?.text || ""
}

export async function POST(request: NextRequest) {
  // Captured outside the try so the error path can still mark the policy failed
  // — the request body is already consumed by then and can't be re-read.
  let policyId: string | undefined

  try {
    const userId = await requireUserId()
    policyId = (await request.json()).policyId

    if (!policyId) {
      return NextResponse.json({ error: "policyId is required" }, { status: 400 })
    }

    // gcsKey is read from the stored document, never taken from the caller, so
    // a request can't be aimed at another user's file.
    const policySnap = await adminDb().collection("userPolicies").doc(policyId).get()
    if (!policySnap.exists || policySnap.data()?.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const gcsKey = policySnap.data()?.gcsKey as string

    console.log(`[policy-parser] Extracting text via Document AI for gs://${gcsKey}`)
    const extractedText = await extractText(gcsKey)

    const truncatedText = extractedText.length > 50000
      ? extractedText.substring(0, 50000) + "\n...[truncated]"
      : extractedText
    console.log(`[policy-parser] Text length after truncation: ${truncatedText.length} chars`)

    const prompt = `You are an expert insurance policy analyst. Parse the following insurance policy document and extract key information.

POLICY DOCUMENT TEXT:
${truncatedText}

Extract and return a JSON object with this exact structure:
{
  "insurer": "<insurance company name>",
  "policyNumber": "<policy number or 'Not found'>",
  "policyType": "<type: health/life/term/motor/travel/etc>",
  "sumInsured": <sum insured in lakhs, number>,
  "deductible": <deductible/excess amount in rupees, 0 if none>,
  "premium": <annual premium in rupees>,
  "policyPeriod": {
    "from": "<DD/MM/YYYY or 'Not specified'>",
    "to": "<DD/MM/YYYY or 'Not specified'>"
  },
  "coveredProcedures": [
    {"name": "<procedure/benefit name>", "limit": <limit in rupees, 0 if unlimited>, "notes": "<sub-limits or conditions>"}
  ],
  "exclusions": ["<exclusion 1>", "<exclusion 2>"],
  "waitingPeriods": [
    {"condition": "<condition name>", "period": "<duration like 2 years, 30 days>"}
  ],
  "roomRentLimit": <room rent limit per day in rupees, 0 if no limit>,
  "coPay": <co-pay percentage, 0 if none>,
  "networkHospitalCount": <number of network hospitals, 0 if unknown>,
  "riders": ["<rider 1>", "<rider 2>"],
  "keyHighlights": ["<highlight 1>", "<highlight 2>", "<highlight 3>"]
}

Return ONLY the JSON, no markdown, no explanation. Fill in "Not found" or 0 for fields that cannot be determined.`

    console.log("[policy-parser] Calling Vertex AI for policy analysis...")
    const content = await callGemini({ prompt, maxTokens: 2048, temperature: 0.1 })

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("[policy-parser] Failed to extract JSON from Vertex AI response:", content)
      throw new Error("Failed to extract JSON from Vertex AI response")
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedCoverage
    console.log(`[policy-parser] Parsed policy — insurer: ${parsed.insurer} | type: ${parsed.policyType}`)

    await adminDb().collection("userPolicies").doc(policyId).update({
      parsedCoverage: JSON.stringify(parsed),
      insurer: parsed.insurer,
      status: "ready",
      updatedAt: new Date().toISOString()
    })
    console.log(`[policy-parser] Firestore updated — policyId: ${policyId}, status: ready`)

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error("[policy-parser] Error:", error)

    // Mark the policy failed so the UI stops polling and shows an error state
    if (policyId) {
      await adminDb()
        .collection("userPolicies")
        .doc(policyId)
        .update({ status: "error" })
        .catch(() => {})
    }

    return NextResponse.json(
      { error: "Policy parsing failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

import type { UserPolicy } from "@/lib/firestore-types"

const MAX_BYTES = 10 * 1024 * 1024

// Returns an error message, or null when the file is acceptable.
export function validatePolicyFile(file: File): string | null {
  if (file.type !== "application/pdf") return "Please upload a PDF file"
  if (file.size > MAX_BYTES) return "File too large — max 10MB allowed"
  return null
}

export async function uploadPolicyPdf(file: File): Promise<UserPolicy> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/policies", { method: "POST", body: formData })
  if (!res.ok) throw new Error("Upload failed")
  const { data } = await res.json()
  const policy = data as UserPolicy

  // Deliberately not awaited: parsing takes tens of seconds and the caller
  // polls /api/policies/[id] for status. The browser keeps this request alive,
  // which is what gives the server CPU to finish the work — the server can't
  // start it itself, since Cloud Run freezes an instance once it responds.
  fetch("/api/policy-parser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policyId: policy.id })
  }).catch(() => {})

  return policy
}

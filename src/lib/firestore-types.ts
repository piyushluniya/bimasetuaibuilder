// Firestore document shapes — replaces the Amplify Data `Schema` type.
// Same 4-model shape as amplify/data/resource.ts, kept for continuity.

export interface UserProfile {
  id: string
  userId: string
  name: string
  age?: number
  city?: string
  familyMembers?: string // JSON stringified
  whatsappNumber?: string
  whatsappConnected?: boolean
  waSessionState?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserCard {
  id: string
  userId: string
  cardName: string
  bankName?: string
  cardType?: string
  coverageData?: string // JSON stringified
  hiddenValue?: number
}

export type PolicyStatus = "uploading" | "parsing" | "ready" | "error"

export interface UserPolicy {
  id: string
  userId: string
  fileName: string
  gcsKey: string
  parsedCoverage?: string // JSON stringified
  insurer?: string
  status: PolicyStatus
}

export interface ChatMessage {
  id: string
  sessionId: string
  userId: string
  role: "user" | "assistant"
  content: string
  timestamp?: string
}

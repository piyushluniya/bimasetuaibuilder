// Firestore document shapes — replaces the Amplify Data `Schema` type.
// Same 4-model shape as amplify/data/resource.ts, kept for continuity.

export interface EmergencyContact {
  name: string
  relation: string
  phone: string
}

// No marketing toggle at MVP stage — the product sends no marketing messages,
// so offering the switch would be a promise with nothing behind it.
export interface NotificationPreferences {
  policyRenewals: boolean
  claimUpdates: boolean
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  policyRenewals: true,
  claimUpdates: true
}

export interface UserProfile {
  id: string
  userId: string
  name: string
  age?: number
  city?: string
  phone?: string
  familyMembers?: string // JSON stringified
  whatsappNumber?: string
  whatsappConnected?: boolean
  waSessionState?: string
  // Stored as native Firestore structures, not JSON strings — these are read
  // server-side by the WhatsApp emergency flow, which needs to query them.
  emergencyContacts?: EmergencyContact[]
  preferences?: NotificationPreferences
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
  role: "user" | "assistant"
  content: string
  confidence?: "high" | "medium" | "low"
  disclaimer?: string
  timestamp: string
}

// Messages are stored inline on the conversation rather than as their own
// collection — a chat stays far below Firestore's 1MB document ceiling, and it
// makes loading a conversation a single read.
export interface ChatConversation {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

// Phone numbers reach us in inconsistent shapes: users type "+91 98765 43210",
// Twilio sends "whatsapp:+919876543210". Firestore can only do exact-string
// matching, so every number is canonicalised to "+<digits>" before it is
// stored or looked up — otherwise a profile never matches an inbound message.
export function normalizePhone(value?: string): string {
  if (!value) return ""
  const digits = value.replace(/^whatsapp:/i, "").replace(/\D/g, "")
  return digits ? `+${digits}` : ""
}

// A country code is mandatory, not a nicety: WhatsApp always identifies senders
// in full international form, so a number saved without one can never match an
// incoming message. Requiring a literal "+" is the only reliable signal that
// the user actually supplied a country code rather than a local number.
export function isValidE164(value?: string): boolean {
  if (!value) return false
  if (!value.trim().startsWith("+")) return false
  const digits = value.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 15
}

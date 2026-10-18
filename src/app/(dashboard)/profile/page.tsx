"use client"

import { useState, useEffect } from "react"
import { signOut, deleteUser } from "firebase/auth"
import { auth, getCurrentUser } from "@/lib/firebase-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icon } from "@/components/ui/icon"
import { QRCodeSVG } from "qrcode.react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { isValidE164 } from "@/lib/phone"
import {
  DEFAULT_PREFERENCES,
  type UserProfile,
  type UserCard,
  type UserPolicy,
  type EmergencyContact,
  type NotificationPreferences
} from "@/lib/firestore-types"

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad",
  "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
  "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik",
  "Faridabad", "Meerut", "Rajkot", "Kalyan", "Vasai-Virar", "Varanasi", "Srinagar", "Other"
]

const PREFERENCE_ITEMS: Array<{
  key: keyof NotificationPreferences
  label: string
  description: string
}> = [
  { key: "policyRenewals", label: "Policy Renewals", description: "Alerts 30 days prior to expiry" },
  { key: "claimUpdates", label: "Claim Updates", description: "Real-time status changes" }
]

// Twilio assigns the sandbox number and join phrase — they differ per account,
// so both come from env rather than being hardcoded. The fallbacks are Twilio's
// shared sandbox number and a placeholder phrase.
const FALLBACK_SANDBOX_NUMBER = "+14155238886"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [profileId, setProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ cards: 0, policies: 0, policiesReady: 0 })

  // Personal info
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [savedState, setSavedState] = useState({ name: "", age: "", city: "", phone: "" })
  const [editingInfo, setEditingInfo] = useState(false)

  // Preferences & emergency contacts
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [contactDraft, setContactDraft] = useState<EmergencyContact>({ name: "", relation: "", phone: "+91" })
  const [addingContact, setAddingContact] = useState(false)
  const [savingContacts, setSavingContacts] = useState(false)

  // WhatsApp
  const [waNumber, setWaNumber] = useState("+91")
  const [waSaved, setWaSaved] = useState("")
  const [waSameAsPrimary, setWaSameAsPrimary] = useState(false)
  const [sandbox, setSandbox] = useState({ number: FALLBACK_SANDBOX_NUMBER, joinCode: "" })

  const waLink = sandbox.joinCode
    ? `https://wa.me/${sandbox.number.replace(/\D/g, "")}?text=${encodeURIComponent(sandbox.joinCode)}`
    : `https://wa.me/${sandbox.number.replace(/\D/g, "")}`
  const [savingWa, setSavingWa] = useState(false)
  const [showWaInstructions, setShowWaInstructions] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => { loadProfile() }, [])

  useEffect(() => {
    fetch("/api/whatsapp/config")
      .then((r) => r.json())
      .then((c) => setSandbox({ number: c.number || FALLBACK_SANDBOX_NUMBER, joinCode: c.joinCode || "" }))
      .catch(() => {})
  }, [])



  async function loadProfile() {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error("Not signed in")
      setEmail(user.email || "")

      const [profileRes, cardsRes, policiesRes]: [{ data: UserProfile[] }, { data: UserCard[] }, { data: UserPolicy[] }] = await Promise.all([
        fetch("/api/profile").then((r) => r.json()),
        fetch("/api/cards").then((r) => r.json()),
        fetch("/api/policies").then((r) => r.json())
      ])

      if (profileRes.data.length > 0) {
        const p = profileRes.data[0]
        const n = p.name || ""
        const a = p.age?.toString() || ""
        const c = p.city || ""
        const ph = p.phone || ""
        const wn = p.whatsappNumber || "+91"

        setName(n); setAge(a); setCity(c); setPhone(ph)
        setSavedState({ name: n, age: a, city: c, phone: ph })
        setPreferences({ ...DEFAULT_PREFERENCES, ...(p.preferences || {}) })
        setEmergencyContacts(p.emergencyContacts || [])
        setProfileId(p.id)
        setWaNumber(wn)
        setWaSaved(wn)
        setWaSameAsPrimary(!!ph && wn === ph)
        setShowWaInstructions(wn !== "+91" && wn.length > 4)
      }

      setStats({
        cards: cardsRes.data.length,
        policies: policiesRes.data.length,
        policiesReady: policiesRes.data.filter((p) => p.status === "ready").length
      })
    } catch {
      // not logged in
    } finally {
      setLoading(false)
    }
  }

  const hasInfoChanges =
    name !== savedState.name || age !== savedState.age || city !== savedState.city ||
    phone !== savedState.phone

  async function handleSaveInfo() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        age: parseInt(age) || undefined,
        city: city || undefined,
        phone: phone.trim() || undefined
      }
      if (profileId) {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: profileId, ...payload })
        })
      } else {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, createdAt: new Date().toISOString() })
        })
        const { data } = await res.json()
        if (data) setProfileId(data.id)
      }
      setSavedState({ name: name.trim(), age, city, phone: phone.trim() })
      toast({ title: "Profile updated" })
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEditInfo() {
    setName(savedState.name)
    setAge(savedState.age)
    setCity(savedState.city)
    setPhone(savedState.phone)
    setEditingInfo(false)
  }

  // Both preferences and emergency contacts write straight through on change —
  // there's no draft/save cycle for them, unlike the personal-details block.
  async function persistProfileFields(fields: Partial<UserProfile>) {
    if (!profileId) {
      toast({ title: "Add your name first", description: "Your profile needs to exist before this can be saved." })
      return false
    }
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: profileId, ...fields })
    })
    return res.ok
  }

  async function togglePreference(key: keyof NotificationPreferences) {
    const next = { ...preferences, [key]: !preferences[key] }
    setPreferences(next)
    const ok = await persistProfileFields({ preferences: next })
    if (!ok) {
      setPreferences(preferences)
      toast({ title: "Couldn't save preference", variant: "destructive" })
    }
  }

  async function saveContacts(next: EmergencyContact[]) {
    setSavingContacts(true)
    const previous = emergencyContacts
    setEmergencyContacts(next)
    const ok = await persistProfileFields({ emergencyContacts: next })
    setSavingContacts(false)
    if (!ok) {
      setEmergencyContacts(previous)
      toast({ title: "Couldn't save contact", variant: "destructive" })
      return false
    }
    return true
  }

  // Emergency contacts are messaged over WhatsApp in an emergency, so they need
  // a country code for exactly the same reason the user's own number does.
  const contactDraftValid =
    contactDraft.name.trim().length > 0 && isValidE164(contactDraft.phone)

  async function handleAddContact() {
    if (!contactDraftValid) return
    const saved = await saveContacts([
      ...emergencyContacts,
      {
        name: contactDraft.name.trim(),
        relation: contactDraft.relation.trim(),
        phone: contactDraft.phone.trim()
      }
    ])
    if (saved) {
      setContactDraft({ name: "", relation: "", phone: "+91" })
      setAddingContact(false)
      toast({ title: "Emergency contact added" })
    }
  }

  const waNumberValid = isValidE164(waNumber)

  async function handleSaveWhatsApp() {
    if (!waNumberValid || !profileId) return
    setSavingWa(true)
    try {
      // Use DynamoDB API route directly — bypasses AppSync schema so the field
      // is written even before sandbox redeploy with the new schema.
      const res = await fetch("/api/whatsapp/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, phone: waNumber })
      })
      if (!res.ok) throw new Error("Link failed")
      setWaSaved(waNumber)
      setShowWaInstructions(true)
      toast({ title: "WhatsApp number saved" })
    } catch {
      toast({ title: "Failed to save number", variant: "destructive" })
    } finally {
      setSavingWa(false)
    }
  }

  async function handleUnlinkWhatsApp() {
    if (!profileId) return
    if (!window.confirm("Unlink WhatsApp? You will stop receiving BimaSetu messages on WhatsApp.")) return
    setUnlinking(true)
    try {
      const res = await fetch("/api/whatsapp/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      })
      if (!res.ok) throw new Error("Unlink failed")
      setWaNumber("+91")
      setWaSaved("")
      setShowWaInstructions(false)
      toast({ title: "WhatsApp unlinked" })
    } catch {
      toast({ title: "Failed to unlink", variant: "destructive" })
    } finally {
      setUnlinking(false)
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Delete your account? This permanently removes all your policies, cards, and data. This cannot be undone.")) return
    if (!window.confirm("Are you absolutely sure? All data will be deleted immediately.")) return
    setDeletingAccount(true)
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error("Not signed in")
      // Delete all Firestore data first
      await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid })
      })
      // Then delete the Firebase Auth user
      await deleteUser(user)
      await fetch("/api/auth/session", { method: "DELETE" })
      router.push("/login")
    } catch (err) {
      toast({ title: "Failed to delete account", variant: "destructive" })
      setDeletingAccount(false)
    }
  }

  async function handleSignOut() {
    await signOut(auth)
    await fetch("/api/auth/session", { method: "DELETE" })
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon name="progress_activity" className="text-3xl leading-none text-secondary animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12">
      {/* Page Header */}
      <div className="mb-8 lg:mb-10">
        <h1 className="font-headline text-2xl lg:text-[32px] font-bold text-primary mb-2">Profile</h1>
        <p className="text-muted-foreground max-w-2xl">
          Manage your personal details and WhatsApp connection so your Setu AI assistant stays in sync.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Primary Profile Card */}
        <div className="lg:col-span-4 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="h-20 bg-accent relative">
            <div className="absolute -bottom-10 left-6">
              <div className="w-20 h-20 rounded-full border-4 border-card bg-primary text-primary-foreground flex items-center justify-center text-2xl font-headline font-bold overflow-hidden">
                {(name || email || "?")[0].toUpperCase()}
              </div>
            </div>
          </div>

          <div className="pt-14 pb-6 px-6 flex-1 flex flex-col">
            {!editingInfo ? (
              <>
                <div className="flex justify-between items-start mb-6 gap-2">
                  <div>
                    <h2 className="font-headline text-xl font-bold text-primary">{name || "No name set"}</h2>
                    {(city || age) && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Icon name="location_on" className="text-base leading-none" />
                        {city}
                        {city && age ? " • " : ""}
                        {age ? `${age} yrs` : ""}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingInfo(true)}
                    className="text-secondary hover:bg-secondary/10 p-2 rounded-full transition-colors shrink-0"
                    aria-label="Edit personal information"
                  >
                    <Icon name="edit" className="text-xl leading-none" />
                  </button>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email ID</Label>
                    <p className="text-sm text-foreground mt-1 flex items-center gap-1.5 break-all">
                      <Icon name="mail" className="text-base leading-none text-muted-foreground shrink-0" />
                      {email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Primary Mobile</Label>
                    <p className="text-sm text-foreground mt-1 flex items-center gap-1.5">
                      <Icon name="call" className="text-base leading-none text-muted-foreground shrink-0" />
                      {phone || <span className="text-muted-foreground">Not set</span>}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline text-lg font-bold text-primary">Edit details</h2>
                  <button
                    onClick={handleCancelEditInfo}
                    className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors"
                    aria-label="Cancel editing"
                  >
                    <Icon name="close" className="text-xl leading-none" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Age</Label>
                    <Input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="32"
                      min="18"
                      max="99"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    >
                      <option value="">Select city</option>
                      {INDIAN_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Primary Mobile</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    aria-invalid={phone.length > 0 && !isValidE164(phone)}
                  />
                  <p
                    className={cn(
                      "text-xs",
                      phone.length > 0 && !isValidE164(phone) ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    Include your country code, e.g. +91.
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email ID</Label>
                  <p className="text-sm text-foreground mt-1 break-all">{email}</p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleSaveInfo}
                  disabled={saving || !name.trim() || !hasInfoChanges}
                >
                  {saving ? (
                    <>
                      <Icon name="progress_activity" className="text-base leading-none animate-spin mr-2" />
                      Saving...
                    </>
                  ) : "Save Changes"}
                </Button>
                {!hasInfoChanges && name && (
                  <p className="text-xs text-secondary flex items-center gap-1">
                    <Icon name="check_circle" filled className="text-sm leading-none" /> Saved
                  </p>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-border">
              <div className="text-center">
                <p className="text-xl font-headline font-bold text-primary">{stats.cards}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Cards Added</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-headline font-bold text-primary">{stats.policies}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Policies Uploaded</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-headline font-bold text-primary">{stats.policiesReady}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Policies Parsed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Connected Services — WhatsApp */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col">
            <h3 className="font-headline text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <Icon name="chat" className="text-secondary text-xl leading-none" />
              Connected Services
            </h3>

            {waSaved && waSaved !== "+91" ? (
              <div className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg border border-border mb-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                    <Icon name="forum" className="text-xl leading-none" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">WhatsApp Setu</h4>
                    <p className="text-sm text-muted-foreground">{waSaved}</p>
                  </div>
                </div>
                <span className="bg-secondary/10 text-secondary px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shrink-0">
                  <Icon name="check" className="text-sm leading-none" />
                  Connected
                </span>
              </div>
            ) : (
              <div className="space-y-1.5 mb-4">
                <Label>WhatsApp Number</Label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="flex-1"
                    disabled={waSameAsPrimary}
                  />
                  <Button
                    onClick={handleSaveWhatsApp}
                    disabled={savingWa || !waNumberValid || waNumber === waSaved}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0"
                  >
                    {savingWa ? <Icon name="progress_activity" className="text-base leading-none animate-spin" /> : "Save"}
                  </Button>
                </div>
                <label className={cn("flex items-center gap-2 pt-1", phone ? "cursor-pointer" : "opacity-60")}>
                  <input
                    type="checkbox"
                    checked={waSameAsPrimary}
                    disabled={!phone}
                    onChange={(e) => {
                      setWaSameAsPrimary(e.target.checked)
                      if (e.target.checked) setWaNumber(phone)
                    }}
                    className="h-4 w-4 shrink-0 accent-[hsl(var(--secondary))]"
                  />
                  <span className="text-sm text-foreground">
                    Same as my primary mobile
                    {!phone && (
                      <span className="block text-xs text-muted-foreground">
                        Add a primary mobile above to use this.
                      </span>
                    )}
                  </span>
                </label>
              </div>
            )}

            {waSaved && waSaved !== "+91" && (
              <p className="text-sm text-muted-foreground mb-4">
                Your BimaSetu AI assistant is connected to this Twilio WhatsApp number for instant policy queries and claim intimation.
              </p>
            )}

            {/* Instructions — shown after saving number */}
            {showWaInstructions && (
              <div className="bg-accent/25 border border-accent rounded-xl p-4 space-y-4 mb-4">
                <p className="text-sm font-semibold text-primary">Activate your WhatsApp connection</p>

                <div className="flex gap-4 items-start flex-wrap">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="bg-white rounded-xl p-2.5 border border-border shadow-sm">
                      <QRCodeSVG
                        value={waLink}
                        size={110}
                        bgColor="#ffffff"
                        fgColor="#111827"
                        level="M"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-secondary font-medium">
                      <Icon name="smartphone" className="text-sm leading-none" />
                      Scan on mobile
                    </div>
                  </div>

                  {/* Manual steps */}
                  <div className="flex-1 min-w-[180px] space-y-2.5">
                    <p className="text-xs text-muted-foreground">Or send this message manually:</p>
                    <div className="bg-card rounded-lg border border-border px-3 py-2 space-y-1.5">
                      <div>
                        <p className="text-xs text-muted-foreground">Send to</p>
                        <p className="font-mono text-sm font-semibold text-foreground">{sandbox.number}</p>
                      </div>
                      <div className="border-t border-border pt-1.5">
                        <p className="text-xs text-muted-foreground">Message</p>
                        {sandbox.joinCode ? (
                          <p className="font-mono text-sm font-semibold text-foreground">{sandbox.joinCode}</p>
                        ) : (
                          <p className="text-sm text-destructive">
                            Join phrase not configured yet — find it in your Twilio sandbox and set it on the server.
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 h-9 text-sm"
                      onClick={() => window.open(waLink, "_blank")}
                    >
                      <Icon name="open_in_new" className="text-sm leading-none" />
                      Open WhatsApp
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Scan the QR with your phone camera, or tap Open WhatsApp — the message is pre-filled, just hit Send.
                </p>
              </div>
            )}

            {/* Unlink button — shown when a number is saved */}
            {waSaved && waSaved !== "+91" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
                onClick={handleUnlinkWhatsApp}
                disabled={unlinking}
              >
                {unlinking ? (
                  <Icon name="progress_activity" className="text-base leading-none animate-spin" />
                ) : (
                  <Icon name="link_off" className="text-base leading-none" />
                )}
                Unlink WhatsApp
              </Button>
            )}

            {/* Note */}
            <p className="text-xs text-muted-foreground mt-4">
              Your number is used only to connect your BimaSetu account. We never share it or use it for marketing.
            </p>
          </div>

          {/* Preferences */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="font-headline text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <Icon name="notifications" className="text-secondary text-xl leading-none" />
              Preferences
            </h3>
            <div className="space-y-4">
              {PREFERENCE_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={preferences[item.key]}
                    aria-label={item.label}
                    onClick={() => togglePreference(item.key)}
                    className={cn(
                      "relative w-11 h-6 rounded-full shrink-0 transition-colors",
                      preferences[item.key] ? "bg-secondary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform",
                        preferences[item.key] && "translate-x-5"
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              These control the WhatsApp alerts BimaSetu sends you. Saved now, applied once WhatsApp
              notifications go live.
            </p>
          </div>

          {/* Emergency Contacts */}
          <div className="bg-card rounded-xl border border-destructive/30 shadow-sm p-6">
            <h3 className="font-headline text-lg font-bold text-destructive flex items-center gap-2 mb-2">
              <Icon name="contact_emergency" className="text-xl leading-none" />
              Emergency Contacts
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              These contacts are notified on WhatsApp — with your location — if you trigger Emergency Mode.
            </p>

            {emergencyContacts.length > 0 && (
              <ul className="space-y-2 mb-4">
                {emergencyContacts.map((c, i) => (
                  <li
                    key={`${c.phone}-${i}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                  >
                    <div className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                      <Icon name="person" className="text-lg leading-none" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {c.name}
                        {c.relation ? <span className="text-muted-foreground font-normal"> ({c.relation})</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                    <button
                      onClick={() => saveContacts(emergencyContacts.filter((_, idx) => idx !== i))}
                      disabled={savingContacts}
                      aria-label={`Remove ${c.name}`}
                      className="p-2 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Icon name="delete" className="text-lg leading-none" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {addingContact ? (
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/40">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      value={contactDraft.name}
                      onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })}
                      placeholder="Ravi Sharma"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Relationship</Label>
                    <Input
                      value={contactDraft.relation}
                      onChange={(e) => setContactDraft({ ...contactDraft, relation: e.target.value })}
                      placeholder="Brother"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp Number</Label>
                  <Input
                    type="tel"
                    value={contactDraft.phone}
                    onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })}
                    placeholder="+91 98765 12345"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddContact} disabled={!contactDraftValid || savingContacts}>
                    {savingContacts ? (
                      <>
                        <Icon name="progress_activity" className="text-base leading-none animate-spin mr-2" />
                        Saving...
                      </>
                    ) : "Add Contact"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAddingContact(false)
                      setContactDraft({ name: "", relation: "", phone: "+91" })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="gap-2" onClick={() => setAddingContact(true)}>
                <Icon name="add" className="text-lg leading-none" />
                {emergencyContacts.length === 0 ? "Add Emergency Contact" : "Add Another Contact"}
              </Button>
            )}
          </div>

          {/* Account */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="font-headline text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <Icon name="shield_person" className="text-secondary text-xl leading-none" />
              Account
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSignOut}
              >
                <Icon name="logout" className="text-base leading-none" />
                Sign Out
              </Button>

              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 text-sm"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? (
                  <Icon name="progress_activity" className="text-base leading-none animate-spin" />
                ) : (
                  <Icon name="delete" className="text-base leading-none" />
                )}
                {deletingAccount ? "Deleting account..." : "Delete Account"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Permanently removes all your data. Cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

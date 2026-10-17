"use client"

import { useState, useEffect } from "react"
import { signOut, deleteUser } from "firebase/auth"
import { auth, getCurrentUser } from "@/lib/firebase-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { QRCodeSVG } from "qrcode.react"
import { useToast } from "@/components/ui/use-toast"
import type { UserProfile, UserCard, UserPolicy } from "@/lib/firestore-types"

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad",
  "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
  "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik",
  "Faridabad", "Meerut", "Rajkot", "Kalyan", "Vasai-Virar", "Varanasi", "Srinagar", "Other"
]

const TWILIO_WHATSAPP_NUMBER = "+14155238886"
const TWILIO_JOIN_CODE = "join type-combine"
const WA_LINK = `https://wa.me/14155238886?text=${encodeURIComponent(TWILIO_JOIN_CODE)}`

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
  const [savedState, setSavedState] = useState({ name: "", age: "", city: "" })
  const [editingInfo, setEditingInfo] = useState(false)

  // WhatsApp
  const [waNumber, setWaNumber] = useState("+91")
  const [waSaved, setWaSaved] = useState("")
  const [savingWa, setSavingWa] = useState(false)
  const [showWaInstructions, setShowWaInstructions] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => { loadProfile() }, [])



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
        const wn = p.whatsappNumber || "+91"

        setName(n); setAge(a); setCity(c)
        setSavedState({ name: n, age: a, city: c })
        setProfileId(p.id)
        setWaNumber(wn)
        setWaSaved(wn)
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
    name !== savedState.name || age !== savedState.age || city !== savedState.city

  async function handleSaveInfo() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        age: parseInt(age) || undefined,
        city: city || undefined
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
      setSavedState({ name: name.trim(), age, city })
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
    setEditingInfo(false)
  }

  const waNumberValid = waNumber.length >= 10 && waNumber !== "+91"

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
                    value={waNumber}
                    onChange={(e) => {
                      let v = e.target.value
                      if (!v.startsWith("+91")) v = "+91" + v.replace(/^\+91/, "")
                      setWaNumber(v)
                    }}
                    placeholder="+91 98765 43210"
                    className="flex-1"
                    maxLength={13}
                  />
                  <Button
                    onClick={handleSaveWhatsApp}
                    disabled={savingWa || !waNumberValid || waNumber === waSaved}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0"
                  >
                    {savingWa ? <Icon name="progress_activity" className="text-base leading-none animate-spin" /> : "Save"}
                  </Button>
                </div>
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
                        value={WA_LINK}
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
                        <p className="font-mono text-sm font-semibold text-foreground">{TWILIO_WHATSAPP_NUMBER}</p>
                      </div>
                      <div className="border-t border-border pt-1.5">
                        <p className="text-xs text-muted-foreground">Message</p>
                        <p className="font-mono text-sm font-semibold text-foreground">{TWILIO_JOIN_CODE}</p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 h-9 text-sm"
                      onClick={() => window.open(WA_LINK, "_blank")}
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

          {/* Account */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="font-headline text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <Icon name="shield_person" className="text-secondary text-xl leading-none" />
              Account
            </h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-2 gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground break-all">{email}</p>
                </div>
                <Badge className="bg-secondary/10 text-secondary border-transparent shrink-0 hover:bg-secondary/10">Verified</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Account type</p>
                  <p className="text-sm text-muted-foreground">Free plan</p>
                </div>
                <Badge variant="secondary" className="shrink-0">Free</Badge>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-3">
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

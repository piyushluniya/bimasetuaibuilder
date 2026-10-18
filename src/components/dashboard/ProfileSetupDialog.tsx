"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/use-toast"
import { isValidE164 } from "@/lib/phone"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  // Null when the user has no profile document yet, in which case we create one.
  profileId: string | null
  onComplete: () => void
}

export default function ProfileSetupDialog({ open, profileId, onComplete }: Props) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [sameAsWhatsApp, setSameAsWhatsApp] = useState(true)
  const [saving, setSaving] = useState(false)

  const ageNum = parseInt(age, 10)
  const phoneValid = isValidE164(phone)
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(ageNum) && ageNum >= 18 && ageNum <= 99 &&
    city.trim().length > 0 &&
    phoneValid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        age: ageNum,
        city: city.trim(),
        phone: phone.trim()
      }
      // Ticking the box only pre-fills the WhatsApp number — the user still has
      // to message the sandbox before whatsappConnected can become true.
      if (sameAsWhatsApp) payload.whatsappNumber = phone.trim()

      const res = profileId
        ? await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: profileId, ...payload })
          })
        : await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, createdAt: new Date().toISOString() })
          })

      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Profile set up", description: "You're all set." })
      onComplete()
    } catch {
      toast({ title: "Couldn't save your details", description: "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-headline text-xl text-primary">
            Finish setting up your profile
          </DialogTitle>
          <DialogDescription>
            Setu AI uses these details to tailor your coverage advice. It only takes a moment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="setup-name">Full name</Label>
            <Input
              id="setup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="setup-age">Age</Label>
              <Input
                id="setup-age"
                type="number"
                min="18"
                max="99"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="32"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-city">City</Label>
              <Input
                id="setup-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Your city"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="setup-phone">Primary mobile number</Label>
            <Input
              id="setup-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              aria-invalid={phone.length > 0 && !phoneValid}
            />
            <p className={cn("text-xs", phone.length > 0 && !phoneValid ? "text-destructive" : "text-muted-foreground")}>
              Start with your country code, e.g. +91 — WhatsApp can&apos;t match your
              account without it.
            </p>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={sameAsWhatsApp}
              onChange={(e) => setSameAsWhatsApp(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--secondary))] cursor-pointer"
            />
            <span className="text-sm text-foreground leading-snug">
              This is also my WhatsApp number
              <span className="block text-xs text-muted-foreground">
                Lets you reach Setu AI on WhatsApp without re-entering it later.
              </span>
            </span>
          </label>

          <Button type="submit" className="w-full" disabled={!valid || saving}>
            {saving ? (
              <>
                <Icon name="progress_activity" className="text-base leading-none animate-spin mr-2" />
                Saving...
              </>
            ) : "Save and continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

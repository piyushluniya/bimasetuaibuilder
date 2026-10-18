"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad",
  "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
  "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad",
  "Meerut", "Rajkot", "Kalyan", "Vasai-Virar", "Varanasi", "Srinagar", "Other"
]

type FamilyData = {
  hasSpouse: boolean
  children: number
  hasParents: boolean
  hasInLaws: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 data
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [city, setCity] = useState("")

  // Step 2 data
  const [family, setFamily] = useState<FamilyData>({
    hasSpouse: false,
    children: 0,
    hasParents: false,
    hasInLaws: false
  })

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100

  async function handleComplete() {
    setLoading(true)
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age: parseInt(age) || 0,
          city,
          familyMembers: JSON.stringify(family),
          createdAt: new Date().toISOString()
        })
      })
      if (!res.ok) throw new Error("Failed to save profile")
      toast({ title: "Profile saved!", description: "Welcome to BimaSetu, " + name + "!" })
      router.push("/dashboard")
    } catch (error) {
      toast({ title: "Failed to save profile", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
              <Icon name="shield_locked" filled className="text-white text-xl" />
            </div>
            <span className="font-headline text-2xl font-bold text-primary">BimaSetu</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {step} of 3</span>
            <span>{progress}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Icon name="person" className="text-secondary text-xl" />
                <CardTitle className="font-headline">Tell us about you</CardTitle>
              </div>
              <CardDescription>This helps us personalize your coverage analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Name</Label>
                <div className="relative">
                  <Icon
                    name="badge"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl"
                  />
                  <Input
                    placeholder="Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-lg pl-10 focus-visible:ring-secondary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <div className="relative">
                  <Icon
                    name="cake"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl"
                  />
                  <Input
                    type="number"
                    placeholder="32"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="18"
                    max="99"
                    className="h-12 rounded-lg pl-10 focus-visible:ring-secondary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <div className="relative">
                  <Icon
                    name="location_on"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl z-10"
                  />
                  <select
                    className="flex h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    <option value="">Select your city</option>
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                className="w-full h-12 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold mt-2"
                onClick={() => setStep(2)}
                disabled={!name || !age || !city}
              >
                Continue
                <Icon name="arrow_forward" className="text-lg" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Family */}
        {step === 2 && (
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Icon name="group" className="text-secondary text-xl" />
                <CardTitle className="font-headline">Your family</CardTitle>
              </div>
              <CardDescription>Family members affect your coverage needs and benefits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "hasSpouse", label: "Spouse / Partner" },
                { key: "hasParents", label: "Parents (dependent)" },
                { key: "hasInLaws", label: "In-laws (dependent)" }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm font-medium">{label}</span>
                  <button
                    onClick={() => setFamily((f) => ({ ...f, [key]: !f[key as keyof FamilyData] }))}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      family[key as keyof FamilyData] ? "bg-secondary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        family[key as keyof FamilyData] ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Children</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFamily((f) => ({ ...f, children: Math.max(0, f.children - 1) }))}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
                  >
                    −
                  </button>
                  <span className="w-4 text-center font-medium">{family.children}</span>
                  <button
                    onClick={() => setFamily((f) => ({ ...f, children: f.children + 1 }))}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-lg" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1 h-12 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold"
                  onClick={() => setStep(3)}
                >
                  Continue
                  <Icon name="arrow_forward" className="text-lg" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Icon name="auto_awesome" className="text-secondary text-xl" />
                <CardTitle className="font-headline">All set, {name}!</CardTitle>
              </div>
              <CardDescription>We&apos;re ready to discover your card insurance coverage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age</span>
                  <span className="font-medium">{age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">City</span>
                  <span className="font-medium">{city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Family</span>
                  <span className="font-medium">
                    {[
                      family.hasSpouse && "Spouse",
                      family.children > 0 && `${family.children} child${family.children > 1 ? "ren" : ""}`,
                      family.hasParents && "Parents"
                    ].filter(Boolean).join(", ") || "Just you"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-lg" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="flex-1 h-12 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold"
                  onClick={handleComplete}
                  disabled={loading}
                >
                  {loading && <Icon name="progress_activity" className="animate-spin text-lg" />}
                  Discover My Coverage
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

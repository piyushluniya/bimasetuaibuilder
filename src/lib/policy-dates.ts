// Policy dates arrive as free text from the AI parser, so everything here is
// defensive: anything unrecognised returns null and the caller falls back to
// showing the raw string rather than inventing a date.

const MS_PER_DAY = 86_400_000

export function parsePolicyDate(value?: string): Date | null {
  if (!value) return null
  const raw = value.trim()
  if (!raw || /not (specified|found|available)/i.test(raw)) return null

  // DD/MM/YYYY or DD-MM-YYYY — the dominant format in policy documents.
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return Number.isNaN(date.getTime()) ? null : date
  }

  // ISO: YYYY-MM-DD
  const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (ymd) {
    const [, y, m, d] = ymd
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const fallback = new Date(raw)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

// "48 months", "30 days", "2 years", "4 yrs" -> a date offset from `start`.
export function addWaitingPeriod(start: Date, period?: string): Date | null {
  if (!period) return null
  const match = period.trim().match(/(\d+)\s*(day|week|month|year|yr)/i)
  if (!match) return null

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  const end = new Date(start)

  if (unit === "day") end.setDate(end.getDate() + amount)
  else if (unit === "week") end.setDate(end.getDate() + amount * 7)
  else if (unit === "month") end.setMonth(end.getMonth() + amount)
  else end.setFullYear(end.getFullYear() + amount)

  return end
}

export function formatPolicyDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// Whole days from today to `date`. Negative means the date has passed.
export function daysUntil(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY)
}

// "12 days" / "3 months" / "2 years" — coarse on purpose, since a countdown in
// days is noise once the horizon is months away.
export function describeDuration(days: number): string {
  const abs = Math.abs(days)
  if (abs < 31) return `${abs} day${abs === 1 ? "" : "s"}`
  const months = Math.round(abs / 30.44)
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`
  return `${Math.round(months / 12)} years`
}

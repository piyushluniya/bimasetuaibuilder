import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

// Shows the actual job the product does: a dense policy document on the left,
// resolved into the handful of answers people actually want on the right.
function HeroIllustration() {
  const answers = [
    { label: "Sum insured", value: "Covered" },
    { label: "Room rent cap", value: "Covered" },
    { label: "Knee surgery", value: "2 yr wait" }
  ]

  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="A dense insurance policy document being turned into clear, readable answers"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="bsHeroBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill="url(#bsHeroBg)" />

      {/* The policy document — deliberately unreadable, that's the problem */}
      <g transform="translate(36 54)">
        <rect width="132" height="176" rx="8" fill="#ffffff" opacity="0.95" />
        <rect x="16" y="18" width="62" height="7" rx="3.5" fill="hsl(var(--primary))" opacity="0.8" />
        {Array.from({ length: 11 }).map((_, i) => (
          <rect
            key={i}
            x="16"
            y={38 + i * 12}
            width={i % 3 === 0 ? 100 : i % 3 === 1 ? 86 : 94}
            height="5"
            rx="2.5"
            fill="hsl(var(--primary))"
            opacity="0.22"
          />
        ))}
      </g>

      {/* Setu AI reading it */}
      <g transform="translate(200 128)">
        <circle r="26" fill="#ffffff" opacity="0.16" />
        <circle r="17" fill="#ffffff" opacity="0.95" />
        <path
          d="M-7 0 l5 5 l9 -10"
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <path
        d="M176 142 H178 M184 142 H190 M196 142 H200"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M226 142 H232 M238 142 H244 M250 142 H254"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* The answers that come out */}
      <g transform="translate(258 70)">
        {answers.map((a, i) => (
          <g key={a.label} transform={`translate(0 ${i * 56})`}>
            <rect width="108" height="44" rx="8" fill="#ffffff" opacity="0.95" />
            <text x="12" y="18" fontSize="9" fill="hsl(var(--primary))" opacity="0.65">
              {a.label}
            </text>
            <text x="12" y="33" fontSize="11" fontWeight="700" fill="hsl(var(--primary))">
              {a.value}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-6 py-16 md:grid-cols-12 md:py-24">
      <div className="flex flex-col gap-6 md:col-span-6">
        <h1 className="font-headline text-3xl font-bold text-primary md:text-5xl md:leading-tight">
          BimaSetu: AI-Powered Insurance Intelligence
        </h1>
        <p className="text-lg text-muted-foreground">
          Because in a medical emergency, the last thing you should worry about is your
          insurance paperwork. Bridge the gap between complex policies and instant
          understanding.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <Link href="/signup">Get Started - It&apos;s Free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 border-primary/30 text-primary">
            <Link href="/login">
              <Icon name="login" className="text-xl leading-none" />
              Sign In
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-primary shadow-sm md:col-span-6 md:mt-0">
        <HeroIllustration />
      </div>
    </section>
  )
}

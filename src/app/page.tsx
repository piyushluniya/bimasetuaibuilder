import Navbar from "@/components/landing/Navbar"
import Hero from "@/components/landing/Hero"
import FeatureSection from "@/components/landing/FeatureSection"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

const stats = [
  {
    icon: "groups",
    iconColor: "text-secondary",
    value: "800M+",
    label: "Indians without adequate health insurance coverage."
  },
  {
    icon: "money_off",
    iconColor: "text-destructive",
    value: "₹26,000Cr",
    label: "Value of insurance claims rejected in FY24 alone."
  },
  {
    icon: "credit_card",
    iconColor: "text-primary",
    value: "100M+",
    label: "Debit/Credit cards with hidden, unutilized insurance."
  }
]

const footerLinks = [
  ["IRDAI Disclaimers", "Bank Partners"],
  ["Emergency Contacts", "Privacy Policy"],
  ["Language: English/हिंदी"]
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />

      {/* Stats Section */}
      <section className="mx-auto max-w-7xl px-6 mb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.value}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-8 text-center shadow-sm"
            >
              <Icon name={stat.icon} className={`mb-2 text-4xl leading-none ${stat.iconColor}`} />
              <h3 className="font-headline text-3xl font-bold text-primary">{stat.value}</h3>
              <p className="text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <FeatureSection />

      {/* WhatsApp Companion Section */}
      <section className="mx-auto max-w-7xl px-6 mb-24">
        <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-xl border border-border bg-muted p-8 md:flex-row md:p-12">
          <div className="relative z-10 md:w-2/3">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <Icon name="health_and_safety" className="text-base leading-none" />
              Emergency Ready
            </div>
            <h2 className="mb-4 font-headline text-3xl font-bold text-primary">
              Your WhatsApp Companion
            </h2>
            <p className="mb-6 text-lg text-muted-foreground">
              Activate emergency mode right from WhatsApp. Get instant hospital network checks,
              pre-authorization document checklists, and proactive alerts without downloading
              another app.
            </p>
            <Button asChild size="lg" className="w-fit gap-2">
              <Link href="/chat">
                <Icon name="chat" className="text-xl leading-none" />
                Start Chatting Now
              </Link>
            </Button>
          </div>
          <div className="relative z-10 flex justify-center md:w-1/3">
            <div className="flex h-80 w-64 flex-col overflow-hidden rounded-xl border-4 border-background bg-card shadow-lg">
              <div className="flex items-center gap-3 bg-[#075E54] p-3 text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  <Icon name="health_and_safety" className="text-sm leading-none text-[#075E54]" />
                </div>
                <div>
                  <div className="text-sm font-semibold">BimaSetu AI</div>
                  <div className="text-[10px] opacity-80">Online</div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 bg-[#E5DDD5] p-4">
                <div className="max-w-[80%] self-start rounded-lg rounded-tl-none bg-white p-2 text-sm shadow-sm">
                  Hello! Are you at the hospital? I can help check network coverage.
                </div>
                <div className="max-w-[80%] self-end rounded-lg rounded-tr-none bg-[#DCF8C6] p-2 text-sm shadow-sm">
                  Yes, Apollo Apollo. Is my HDFC Ergo plan cashless here?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-12 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <div className="font-headline text-xl font-semibold text-primary">BimaSetu</div>
            <p className="text-sm text-muted-foreground">© 2026 BimaSetu</p>
          </div>
          {footerLinks.map((column, i) => (
            <div key={i} className="flex flex-col gap-2">
              {column.map((label) => (
                <a
                  key={label}
                  href="#"
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
                >
                  {label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </footer>
    </main>
  )
}

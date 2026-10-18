import { Icon } from "@/components/ui/icon"

const features = [
  {
    icon: "summarize",
    title: "AI Coverage Card",
    description:
      "One-screen summary of your 60-page policy. Instantly understand what's covered, what's not, and the limits of your plan without reading legal jargon.",
    span: "md:col-span-8",
    iconBg: "bg-muted",
    iconColor: "text-primary"
  },
  {
    icon: "account_balance_wallet",
    title: "Hidden Card Discovery",
    description: "Find free insurance linked to your bank accounts you didn't know you had.",
    span: "md:col-span-4",
    iconBg: "bg-accent",
    iconColor: "text-accent-foreground"
  },
  {
    icon: "local_hospital",
    title: "BimaCheck",
    description:
      "Instant hospital cost verification. Ensure you aren't being overcharged before you pay the bill.",
    span: "md:col-span-5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary"
  },
  {
    icon: "gavel",
    title: "Claim Fighter",
    description:
      "AI-powered grievance letters drafted in seconds for rejected claims, leveraging regulatory guidelines to fight for your rights automatically.",
    span: "md:col-span-7",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    decorative: true
  }
]

export default function FeatureSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 mb-24">
      <div className="mb-12 text-center">
        <h2 className="font-headline text-3xl font-bold text-primary">The Bridge to Clarity</h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Simplify, discover, and fight for your health coverage.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {features.map((feature) => (
          <div
            key={feature.title}
            className={`${feature.span} relative flex flex-col justify-center overflow-hidden rounded-xl border border-border bg-card p-8 shadow-sm transition-all hover:shadow-md`}
          >
            <div
              className={`relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-full ${feature.iconBg}`}
            >
              <Icon name={feature.icon} className={`text-2xl leading-none ${feature.iconColor}`} />
            </div>
            <h3 className="relative z-10 mb-2 font-headline text-xl font-semibold text-primary">
              {feature.title}
            </h3>
            <p className="relative z-10 max-w-lg text-muted-foreground">{feature.description}</p>
            {feature.decorative && (
              <Icon
                name={feature.icon}
                className="pointer-events-none absolute -bottom-4 -right-4 select-none text-[120px] leading-none text-muted opacity-50"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

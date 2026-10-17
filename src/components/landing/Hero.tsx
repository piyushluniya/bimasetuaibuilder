import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-6 py-16 md:grid-cols-12 md:py-24">
      <div className="flex flex-col gap-6 md:col-span-6">
        <h1 className="font-headline text-3xl font-bold text-primary md:text-5xl md:leading-tight">
          BimaSetu: AI-Powered Insurance Intelligence for Every Indian
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

      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl shadow-sm md:col-span-6 md:mt-0">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary via-primary to-secondary">
          <Icon name="hub" className="text-[160px] leading-none text-white/15 md:text-[200px]" />
        </div>
        <div className="absolute bottom-6 left-6 text-xs font-semibold uppercase tracking-wide text-white/80">
          Complex Data
          <br />
          (Insurance)
        </div>
        <div className="absolute bottom-6 right-6 text-right text-xs font-semibold uppercase tracking-wide text-white/80">
          Human-Centric
          <br />
          Interface
        </div>
      </div>
    </section>
  )
}

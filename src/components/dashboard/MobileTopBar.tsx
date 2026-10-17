import { Icon } from "@/components/ui/icon"

// Minimal mobile-only brand header. The designs also show search/notification/
// avatar icons here, but those aren't backed by real features (no search, no
// notifications, no avatar upload) — omitted rather than shipped as decoration.
export default function MobileTopBar() {
  return (
    <header className="md:hidden flex items-center gap-2 w-full h-16 px-4 bg-background border-b border-border sticky top-0 z-30">
      <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Icon name="shield_locked" filled className="text-base leading-none" />
      </div>
      <span className="font-headline font-bold text-lg text-primary">BimaSetu</span>
    </header>
  )
}

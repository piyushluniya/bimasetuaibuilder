"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Home" },
  { href: "/claims", icon: "assignment_turned_in", label: "Claims" },
  { href: "/policies", icon: "description", label: "Policies" },
  { href: "/profile", icon: "person", label: "Profile" }
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex justify-around items-center z-40">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors",
              isActive ? "text-secondary" : "text-muted-foreground"
            )}
          >
            {isActive ? (
              <div className="bg-accent rounded-full px-4 py-1">
                <Icon name={item.icon} filled className="text-xl leading-none" />
              </div>
            ) : (
              <Icon name={item.icon} className="text-xl leading-none" />
            )}
            <span className="text-[10px] font-medium leading-none mt-0.5">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

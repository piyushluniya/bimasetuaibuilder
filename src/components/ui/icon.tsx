import { cn } from "@/lib/utils"

interface IconProps {
  name: string
  className?: string
  filled?: boolean
}

// Material Symbols Outlined wrapper — replaces lucide-react across the app
// to match the BimaSetu design system (designs/reliability_clarity/DESIGN.md).
// Icon names come from https://fonts.google.com/icons
export function Icon({ name, className, filled }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
    >
      {name}
    </span>
  )
}

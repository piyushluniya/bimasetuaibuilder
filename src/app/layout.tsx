import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-jakarta"
})

export const metadata: Metadata = {
  title: "BimaSetu — Your AI Insurance Intelligence Portal",
  description:
    "Discover hidden insurance in your credit cards, parse policies with AI, and get personalized coverage advice in minutes."
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${jakarta.variable} ${inter.className}`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}

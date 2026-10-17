import Sidebar from "@/components/dashboard/Sidebar"
import MobileTopBar from "@/components/dashboard/MobileTopBar"
import MobileBottomNav from "@/components/dashboard/MobileBottomNav"
import FloatingChatWidget from "@/components/chat/FloatingChatWidget"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileTopBar />
      <main className="md:ml-64 pb-16 md:pb-0 min-h-screen">
        {children}
      </main>
      <MobileBottomNav />
      <FloatingChatWidget />
    </div>
  )
}

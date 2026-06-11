import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth/config"
import DashboardSidebar from "@/components/layout/DashboardSidebar"
import DashboardHeader from "@/components/layout/DashboardHeader"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthSession()
  if (!session?.user) redirect("/auth/login")

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      <DashboardSidebar user={session.user} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader user={session.user} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Repeat2, Briefcase, FileText,
  MessageSquare, User, Star, Settings, LogOut,
  Bell, TrendingUp, Shield, ChevronLeft
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils/cn"

interface Props {
  user: {
    displayName?: string | null
    name?: string | null
    image?: string | null
    role: string
    availablePoints: number
    username: string
  }
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/exchanges", label: "تبادلاتي", icon: Repeat2 },
  { href: "/dashboard/services", label: "خدماتي", icon: Briefcase },
  { href: "/dashboard/requests", label: "طلباتي", icon: FileText },
  { href: "/dashboard/messages", label: "الرسائل", icon: MessageSquare },
  { href: "/dashboard/notifications", label: "الإشعارات", icon: Bell },
  { href: "/dashboard/points", label: "نقاطي", icon: TrendingUp },
  { href: "/dashboard/reviews", label: "التقييمات", icon: Star },
  { href: "/dashboard/profile", label: "ملفي الشخصي", icon: User },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
]

const ADMIN_ITEMS = [
  { href: "/admin", label: "لوحة الإدارة", icon: Shield },
]

export default function DashboardSidebar({ user }: Props) {
  const pathname = usePathname()

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-l border-slate-100 flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2 font-black text-xl">
          <span className="w-8 h-8 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <Repeat2 className="w-4 h-4 text-white" />
          </span>
          <span className="gradient-text">SwapHub</span>
        </Link>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {(user.displayName || user.name || "م")[0]}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-sm truncate">
              {user.displayName || user.name}
            </div>
            <div className="points-badge text-xs mt-0.5">
              ⭐ {user.availablePoints.toLocaleString("ar-SA")} نقطة
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              isActive(item.href, item.exact)
                ? "bg-sky-50 text-sky-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className={cn(
              "w-4.5 h-4.5 shrink-0",
              isActive(item.href, item.exact) ? "text-sky-600" : "text-slate-400"
            )} />
            {item.label}
            {isActive(item.href, item.exact) && (
              <ChevronLeft className="w-3.5 h-3.5 mr-auto text-sky-400 rtl-flip" />
            )}
          </Link>
        ))}

        {/* Admin section */}
        {["ADMIN", "SUPER_ADMIN", "MODERATOR"].includes(user.role) && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">إدارة</span>
            </div>
            {ADMIN_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive(item.href)
                    ? "bg-red-50 text-red-700"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0 text-red-400" />
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}

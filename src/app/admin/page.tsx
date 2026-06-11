import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import {
  Users, Repeat2, Briefcase, Flag,
  TrendingUp, AlertCircle, CheckCircle, Clock
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

async function getAdminStats() {
  const [
    totalUsers, activeUsers, newUsersToday,
    totalServices, activeServices,
    totalExchanges, completedExchanges, disputedExchanges,
    pendingReports, totalPoints
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
    }),
    prisma.service.count(),
    prisma.service.count({ where: { status: "ACTIVE" } }),
    prisma.exchange.count(),
    prisma.exchange.count({ where: { status: "COMPLETED" } }),
    prisma.exchange.count({ where: { isDisputed: true } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.user.aggregate({ _sum: { availablePoints: true } }),
  ])

  return {
    totalUsers, activeUsers, newUsersToday,
    totalServices, activeServices,
    totalExchanges, completedExchanges, disputedExchanges,
    pendingReports,
    totalPointsInCirculation: totalPoints._sum.availablePoints || 0,
  }
}

async function getRecentActivity() {
  const [recentUsers, recentExchanges, recentReports] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, username: true, displayName: true, createdAt: true, status: true },
    }),
    prisma.exchange.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        provider: { select: { displayName: true } },
        receiver: { select: { displayName: true } },
      },
    }),
    prisma.report.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        reporter: { select: { displayName: true } },
      },
    }),
  ])

  return { recentUsers, recentExchanges, recentReports }
}

export default async function AdminPage() {
  const session = await getAuthSession()
  if (!session?.user) redirect("/auth/login")
  if (!["ADMIN", "SUPER_ADMIN", "MODERATOR"].includes(session.user.role)) {
    redirect("/dashboard")
  }

  const [stats, activity] = await Promise.all([getAdminStats(), getRecentActivity()])

  const STAT_CARDS = [
    { label: "إجمالي المستخدمين", value: stats.totalUsers.toLocaleString("ar-SA"), sub: `+${stats.newUsersToday} اليوم`, icon: Users, color: "bg-sky-50 text-sky-600" },
    { label: "مستخدمون نشطون", value: stats.activeUsers.toLocaleString("ar-SA"), icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
    { label: "خدمات نشطة", value: stats.activeServices.toLocaleString("ar-SA"), sub: `من ${stats.totalServices.toLocaleString("ar-SA")} إجمالاً`, icon: Briefcase, color: "bg-amber-50 text-amber-600" },
    { label: "تبادلات مكتملة", value: stats.completedExchanges.toLocaleString("ar-SA"), sub: `من ${stats.totalExchanges.toLocaleString("ar-SA")} إجمالاً`, icon: Repeat2, color: "bg-purple-50 text-purple-600" },
    { label: "نقاط في التداول", value: stats.totalPointsInCirculation.toLocaleString("ar-SA"), icon: TrendingUp, color: "bg-yellow-50 text-yellow-600" },
    { label: "تبادلات متنازع عليها", value: stats.disputedExchanges, icon: AlertCircle, color: "bg-red-50 text-red-600" },
    { label: "بلاغات معلقة", value: stats.pendingReports, icon: Flag, color: stats.pendingReports > 0 ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500", urgent: stats.pendingReports > 0 },
    { label: "معدل الإكمال", value: `${stats.totalExchanges > 0 ? Math.round((stats.completedExchanges / stats.totalExchanges) * 100) : 0}%`, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
  ]

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">لوحة التحكم</h1>
        <p className="text-slate-500 mt-1">نظرة عامة على SwapHub</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => (
          <div key={card.label} className={`card ${card.urgent ? "border-red-200 ring-1 ring-red-200" : ""}`}>
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-slate-900">{card.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{card.label}</div>
            {card.sub && <div className="text-xs text-slate-400 mt-0.5">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/admin/users", label: "إدارة المستخدمين", icon: "👥" },
          { href: "/admin/services", label: "إدارة الخدمات", icon: "🔧" },
          { href: "/admin/reports", label: `البلاغات (${stats.pendingReports})`, icon: "🚨", urgent: stats.pendingReports > 0 },
          { href: "/admin/exchanges", label: "التبادلات المتنازع عليها", icon: "⚖️" },
        ].map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`card-interactive flex flex-col items-center gap-2 p-5 text-center ${link.urgent ? "border-red-200 bg-red-50" : ""}`}
          >
            <span className="text-3xl">{link.icon}</span>
            <span className={`text-sm font-semibold ${link.urgent ? "text-red-700" : "text-slate-700"}`}>{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500" /> آخر المسجلين
          </h2>
          <div className="space-y-3">
            {activity.recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {u.displayName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm">{u.displayName}</div>
                  <div className="text-xs text-slate-400">@{u.username}</div>
                </div>
                <span className={`badge text-xs ${u.status === "ACTIVE" ? "badge-accent" : "badge-danger"}`}>
                  {u.status === "ACTIVE" ? "نشط" : u.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Exchanges */}
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Repeat2 className="w-4 h-4 text-emerald-500" /> آخر التبادلات
          </h2>
          <div className="space-y-3">
            {activity.recentExchanges.map(ex => (
              <div key={ex.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-xs line-clamp-1">{ex.title}</div>
                  <div className="text-xs text-slate-400">
                    {ex.provider.displayName} ↔ {ex.receiver.displayName}
                  </div>
                </div>
                <span className={`badge text-xs exchange-status-${ex.status.toLowerCase()}`}>
                  {ex.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Reports */}
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" /> بلاغات معلقة
          </h2>
          {activity.recentReports.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
              <p className="text-sm">لا توجد بلاغات معلقة 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.recentReports.map(report => (
                <Link key={report.id} href={`/admin/reports/${report.id}`} className="block p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                  <div className="font-semibold text-red-800 text-xs">{report.reason}</div>
                  <div className="text-xs text-red-600 mt-0.5">
                    من: {report.reporter.displayName} · {report.targetType}
                  </div>
                </Link>
              ))}
              <Link href="/admin/reports" className="block text-center text-sm text-red-600 font-semibold hover:underline pt-1">
                عرض جميع البلاغات
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

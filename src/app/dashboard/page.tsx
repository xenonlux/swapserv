import { getAuthSession } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Repeat2, Briefcase, Star, TrendingUp, Clock,
  ArrowLeft, CheckCircle, AlertCircle, MessageSquare
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

export const dynamic = "force-dynamic"

async function getDashboardData(userId: string) {
  const [
    activeExchanges, completedExchanges, myServices,
    avgRating, recentExchanges, recentNotifications,
    points, unreadMessages
  ] = await Promise.all([
    prisma.exchange.count({
      where: {
        OR: [{ providerId: userId }, { receiverId: userId }],
        status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
      },
    }),
    prisma.exchange.count({
      where: {
        OR: [{ providerId: userId }, { receiverId: userId }],
        status: "COMPLETED",
      },
    }),
    prisma.service.count({ where: { providerId: userId, status: "ACTIVE" } }),
    prisma.review.aggregate({
      where: { receiverId: userId },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.exchange.findMany({
      where: {
        OR: [{ providerId: userId }, { receiverId: userId }],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        provider: { select: { displayName: true, avatar: true } },
        receiver: { select: { displayName: true, avatar: true } },
      },
    }),
    prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { availablePoints: true, reservedPoints: true, lifetimePointsEarned: true },
    }),
    prisma.message.count({
      where: { isRead: false, senderId: { not: userId } },
    }),
  ])

  return {
    activeExchanges, completedExchanges, myServices,
    avgRating: avgRating._avg.rating || 0,
    totalReviews: avgRating._count,
    recentExchanges, recentNotifications, points, unreadMessages
  }
}

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: typeof CheckCircle }> = {
  PENDING:     { label: "في الانتظار", class: "exchange-status-pending", icon: Clock },
  ACCEPTED:    { label: "مقبول", class: "exchange-status-accepted", icon: CheckCircle },
  IN_PROGRESS: { label: "جارٍ", class: "exchange-status-in_progress", icon: TrendingUp },
  COMPLETED:   { label: "مكتمل", class: "exchange-status-completed", icon: CheckCircle },
  DISPUTED:    { label: "متنازع عليه", class: "exchange-status-disputed", icon: AlertCircle },
  CANCELLED:   { label: "ملغى", class: "exchange-status-cancelled", icon: AlertCircle },
}

export default async function DashboardPage() {
  const session = await getAuthSession()
  if (!session?.user) redirect("/auth/login")

  const data = await getDashboardData(session.user.id)

  const STATS = [
    {
      label: "تبادلات نشطة",
      value: data.activeExchanges,
      icon: Repeat2,
      color: "bg-sky-50 text-sky-600",
      href: "/dashboard/exchanges?status=PENDING",
    },
    {
      label: "تبادلات مكتملة",
      value: data.completedExchanges,
      icon: CheckCircle,
      color: "bg-emerald-50 text-emerald-600",
      href: "/dashboard/exchanges?status=COMPLETED",
    },
    {
      label: "خدماتي النشطة",
      value: data.myServices,
      icon: Briefcase,
      color: "bg-amber-50 text-amber-600",
      href: "/dashboard/services",
    },
    {
      label: "تقييمي",
      value: data.avgRating > 0 ? `${data.avgRating.toFixed(1)} ★` : "—",
      icon: Star,
      color: "bg-purple-50 text-purple-600",
      href: "/dashboard/reviews",
      subtitle: data.totalReviews > 0 ? `${data.totalReviews} تقييم` : "لا يوجد تقييمات بعد",
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">
          أهلاً، {session.user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          إليك ملخص نشاطك على SwapHub
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card-interactive group">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
            {stat.subtitle && (
              <div className="text-xs text-slate-400 mt-0.5">{stat.subtitle}</div>
            )}
          </Link>
        ))}
      </div>

      {/* Points Summary */}
      {data.points && (
        <div className="card bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              نقاطي
            </h2>
            <Link href="/dashboard/points" className="text-sm text-amber-600 font-semibold hover:underline">
              السجل الكامل
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-amber-600">
                {data.points.availablePoints.toLocaleString("ar-SA")}
              </div>
              <div className="text-sm text-slate-500 mt-1">متاحة</div>
            </div>
            <div className="text-center border-x border-amber-200">
              <div className="text-3xl font-black text-slate-400">
                {data.points.reservedPoints.toLocaleString("ar-SA")}
              </div>
              <div className="text-sm text-slate-500 mt-1">محجوزة</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-600">
                {data.points.lifetimePointsEarned.toLocaleString("ar-SA")}
              </div>
              <div className="text-sm text-slate-500 mt-1">إجمالي مكتسب</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Exchanges */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">آخر التبادلات</h2>
            <Link href="/dashboard/exchanges" className="text-sm text-sky-600 font-semibold hover:underline flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentExchanges.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Repeat2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا يوجد تبادلات بعد</p>
                <Link href="/explore" className="btn-primary btn-sm mt-4 inline-flex">
                  استكشف الخدمات
                </Link>
              </div>
            ) : (
              data.recentExchanges.map((ex) => {
                const isProvider = ex.providerId === session.user.id
                const other = isProvider ? ex.receiver : ex.provider
                const cfg = STATUS_CONFIG[ex.status] || STATUS_CONFIG.PENDING

                return (
                  <Link
                    key={ex.id}
                    href={`/dashboard/exchanges/${ex.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {other.displayName?.[0] || "م"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 text-sm truncate">{ex.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        مع {other.displayName} · {formatDistanceToNow(ex.updatedAt, { addSuffix: true, locale: ar })}
                      </div>
                    </div>
                    <span className={cfg.class}>{cfg.label}</span>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">الإشعارات الجديدة</h2>
            <Link href="/dashboard/notifications" className="text-sm text-sky-600 font-semibold hover:underline flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentNotifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              data.recentNotifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.actionUrl || "/dashboard/notifications"}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-sky-500 mt-2 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{n.titleAr || n.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.bodyAr || n.body}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ar })}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="font-bold text-slate-900 mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/services/new", icon: "➕", label: "أضف خدمة" },
            { href: "/dashboard/requests/new", icon: "📋", label: "انشر طلباً" },
            { href: "/explore", icon: "🔍", label: "استكشف الخدمات" },
            { href: "/explore?type=requests", icon: "💡", label: "تصفح الطلبات" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
              <span className="text-sm font-medium text-slate-600 group-hover:text-sky-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

import { getAuthSession } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { TrendingUp, TrendingDown, Lock, Gift, Star } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

export const dynamic = "force-dynamic"

const TX_ICONS: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
  EARNED:   { icon: TrendingUp,   color: "text-emerald-600 bg-emerald-50", label: "مكتسب" },
  SPENT:    { icon: TrendingDown, color: "text-red-600 bg-red-50",         label: "مُنفق" },
  LOCKED:   { icon: Lock,         color: "text-amber-600 bg-amber-50",     label: "محجوز" },
  UNLOCKED: { icon: TrendingUp,   color: "text-sky-600 bg-sky-50",         label: "محرَّر" },
  BONUS:    { icon: Gift,         color: "text-purple-600 bg-purple-50",   label: "مكافأة" },
  PENALTY:  { icon: TrendingDown, color: "text-red-600 bg-red-50",         label: "خصم" },
}

export default async function PointsPage() {
  const session = await getAuthSession()
  if (!session?.user) redirect("/auth/login")

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        availablePoints: true,
        reservedPoints: true,
        totalPoints: true,
        lifetimePointsEarned: true,
        lifetimePointsSpent: true,
        badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
      },
    }),
    prisma.pointsTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  if (!user) redirect("/auth/login")

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">نقاطي</h1>
        <p className="text-slate-500 mt-1">تتبع رصيدك ومعاملاتك</p>
      </div>

      {/* Points Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "النقاط المتاحة", value: user.availablePoints, color: "from-sky-500 to-emerald-500", main: true },
          { label: "النقاط المحجوزة", value: user.reservedPoints, color: "from-amber-400 to-amber-500" },
          { label: "إجمالي المكتسب", value: user.lifetimePointsEarned, color: "from-emerald-500 to-teal-500" },
          { label: "إجمالي المُنفق", value: user.lifetimePointsSpent, color: "from-slate-400 to-slate-500" },
        ].map(item => (
          <div
            key={item.label}
            className={`card ${item.main ? "bg-gradient-to-br " + item.color + " text-white border-0" : ""}`}
          >
            <div className={`text-3xl font-black mb-1 ${item.main ? "text-white" : "text-slate-900"}`}>
              {item.value.toLocaleString("ar-SA")}
            </div>
            <div className={`text-sm ${item.main ? "text-white/80" : "text-slate-500"}`}>
              {item.label}
            </div>
            {item.main && <Star className="w-5 h-5 text-white/60 mt-2" />}
          </div>
        ))}
      </div>

      {/* How to earn */}
      <div className="card bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
        <h2 className="font-bold text-amber-900 mb-4">💡 كيف تكسب المزيد من النقاط؟</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { action: "إتمام تبادل", points: "+100" },
            { action: "الحصول على تقييم 5 نجوم", points: "+25" },
            { action: "إحالة صديق", points: "+75" },
            { action: "إكمال الملف الشخصي", points: "+30" },
            { action: "أول تبادل ناجح", points: "+50 مكافأة" },
            { action: "تسجيل الدخول اليومي", points: "+5" },
          ].map(item => (
            <div key={item.action} className="flex items-center justify-between p-3 bg-white rounded-xl">
              <span className="text-sm text-slate-700">{item.action}</span>
              <span className="font-bold text-emerald-600 text-sm">{item.points} ⭐</span>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      {user.badges.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-4">🏆 شاراتي</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {user.badges.map(({ badge, earnedAt }) => (
              <div key={badge.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-3xl">{badge.icon}</span>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{badge.nameAr}</div>
                  <div className="text-xs text-slate-400">
                    {formatDistanceToNow(earnedAt, { addSuffix: true, locale: ar })}
                  </div>
                  {badge.points > 0 && (
                    <div className="text-xs text-amber-600 font-semibold">+{badge.points} ⭐</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="card">
        <h2 className="font-bold text-slate-900 mb-4">سجل المعاملات</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد معاملات بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const cfg = TX_ICONS[tx.type] || TX_ICONS.EARNED
              const isPositive = tx.amount > 0

              return (
                <div key={tx.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <cfg.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm">{tx.reason}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatDistanceToNow(tx.createdAt, { addSuffix: true, locale: ar })} · {cfg.label}
                    </div>
                  </div>
                  <div className={`font-black text-sm shrink-0 ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                    {isPositive ? "+" : ""}{tx.amount.toLocaleString("ar-SA")} ⭐
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

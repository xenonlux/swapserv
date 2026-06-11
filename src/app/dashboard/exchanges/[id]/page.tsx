import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import ExchangeChat from "@/components/chat/ExchangeChat"
import ExchangeActions from "@/components/services/ExchangeActions"
import MilestoneList from "@/components/services/MilestoneList"
import {
  CheckCircle, Clock, TrendingUp, AlertCircle,
  User, Star, ArrowLeft, Repeat2
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  PENDING:     { label: "في الانتظار", icon: Clock, color: "text-slate-600", bg: "bg-slate-100" },
  ACCEPTED:    { label: "مقبول", icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-100" },
  IN_PROGRESS: { label: "جارٍ التنفيذ", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-100" },
  COMPLETED:   { label: "مكتمل ✓", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
  DISPUTED:    { label: "متنازع عليه", icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
  CANCELLED:   { label: "ملغى", icon: AlertCircle, color: "text-slate-500", bg: "bg-slate-100" },
}

async function getExchange(id: string, userId: string) {
  const exchange = await prisma.exchange.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          id: true, username: true, displayName: true, avatar: true,
          reputationScore: true, totalReviews: true, completedExchanges: true,
          isIdentityVerified: true,
        }
      },
      receiver: {
        select: {
          id: true, username: true, displayName: true, avatar: true,
          reputationScore: true, totalReviews: true, completedExchanges: true,
          isIdentityVerified: true,
        }
      },
      providerService: { select: { id: true, title: true, images: true, type: true } },
      receiverService: { select: { id: true, title: true, images: true, type: true } },
      milestones: { orderBy: { order: "asc" } },
      reviews: {
        where: { OR: [{ giverId: userId }, { receiverId: userId }] },
        include: { giver: { select: { displayName: true, avatar: true } } },
      },
    },
  })
  return exchange
}

export default async function ExchangeDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getAuthSession()
  if (!session?.user) redirect("/auth/login")

  const exchange = await getExchange(params.id, session.user.id)
  if (!exchange) notFound()

  const isProvider = exchange.providerId === session.user.id
  const isReceiver = exchange.receiverId === session.user.id
  if (!isProvider && !isReceiver) notFound()

  const myRole = isProvider ? "provider" : "receiver"
  const me = isProvider ? exchange.provider : exchange.receiver
  const other = isProvider ? exchange.receiver : exchange.provider
  const status = STATUS_MAP[exchange.status] || STATUS_MAP.PENDING
  const hasReviewed = exchange.reviews.some(r => r.giverId === session.user.id)
  const canReview = exchange.status === "COMPLETED" && !hasReviewed

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/exchanges" className="hover:text-sky-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4 rtl-flip" /> التبادلات
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate">{exchange.title}</span>
      </div>

      {/* Status Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className={`inline-flex items-center gap-2 ${status.bg} ${status.color} rounded-xl px-3 py-1.5 text-sm font-bold mb-3`}>
              <status.icon className="w-4 h-4" />
              {status.label}
            </div>
            <h1 className="text-2xl font-black text-slate-900">{exchange.title}</h1>
            <p className="text-slate-500 mt-1 text-sm">
              بدأ {formatDistanceToNow(exchange.createdAt, { addSuffix: true, locale: ar })}
            </p>
          </div>
          <ExchangeActions
            exchange={{
              id: exchange.id,
              status: exchange.status,
              providerId: exchange.providerId,
              receiverId: exchange.receiverId,
              providerConfirmed: exchange.providerConfirmed,
              receiverConfirmed: exchange.receiverConfirmed,
              type: exchange.type,
              pointsAmount: exchange.pointsAmount,
            }}
            myRole={myRole}
            canReview={canReview}
          />
        </div>

        {/* Exchange type banner */}
        <div className="mt-4 p-4 bg-gradient-to-r from-sky-50 to-emerald-50 rounded-xl border border-sky-100">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Provider service */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                <User className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">يقدم</div>
                <div className="font-semibold text-slate-800 text-sm">
                  {exchange.providerService?.title || exchange.provider.displayName}
                </div>
              </div>
            </div>

            <Repeat2 className="w-5 h-5 text-slate-400 mx-2" />

            {/* Receiver service / Points */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                {exchange.type === "POINTS" || exchange.type === "HYBRID" ? (
                  <span className="text-sm">⭐</span>
                ) : (
                  <User className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500">مقابل</div>
                <div className="font-semibold text-slate-800 text-sm">
                  {exchange.type === "POINTS"
                    ? `${exchange.pointsAmount?.toLocaleString("ar-SA")} نقطة`
                    : exchange.receiverService?.title || "خدمة مقابلة"}
                </div>
              </div>
            </div>

            {exchange.estimatedDuration && (
              <div className="mr-auto flex items-center gap-1.5 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                {exchange.estimatedDuration} ساعة تقريباً
              </div>
            )}
          </div>
        </div>

        {exchange.description && (
          <div className="mt-4">
            <h3 className="font-semibold text-slate-700 mb-2 text-sm">الوصف</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{exchange.description}</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chat - takes 2 cols */}
        <div className="lg:col-span-2 h-[600px] flex flex-col">
          <ExchangeChat
            exchangeId={exchange.id}
            otherUser={{ id: other.id, displayName: other.displayName, avatar: other.avatar }}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Other user card */}
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">الطرف الآخر</h3>
            <Link href={`/profile/${other.username}`} className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white font-bold text-lg">
                {other.displayName[0]}
              </div>
              <div>
                <div className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors flex items-center gap-1">
                  {other.displayName}
                  {other.isIdentityVerified && <span className="text-sky-500 text-sm">✓</span>}
                </div>
                <div className="text-sm text-slate-500">@{other.username}</div>
              </div>
            </Link>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-center">
              <div>
                <div className="font-black text-slate-900">
                  {other.reputationScore > 0 ? other.reputationScore.toFixed(1) : "—"}
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> تقييم
                </div>
              </div>
              <div>
                <div className="font-black text-slate-900">{other.completedExchanges}</div>
                <div className="text-xs text-slate-400">تبادل</div>
              </div>
              <div>
                <div className="font-black text-slate-900">{other.totalReviews}</div>
                <div className="text-xs text-slate-400">تقييم</div>
              </div>
            </div>
          </div>

          {/* Milestones */}
          {exchange.milestones.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">مراحل التسليم</h3>
              <MilestoneList
                milestones={exchange.milestones}
                exchangeId={exchange.id}
                canEdit={exchange.status === "IN_PROGRESS" && isProvider}
              />
            </div>
          )}

          {/* Reviews */}
          {exchange.reviews.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">التقييمات</h3>
              {exchange.reviews.map(review => (
                <div key={review.id} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-semibold text-slate-800 text-sm">{review.giver.displayName}</div>
                    <div className="flex gap-0.5 mr-auto">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? "star-filled" : "star-empty"}`} />
                      ))}
                    </div>
                  </div>
                  {review.content && <p className="text-xs text-slate-600">{review.content}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Terms */}
          {exchange.terms && (
            <div className="card border-amber-100 bg-amber-50">
              <h3 className="font-bold text-amber-800 mb-2 text-sm">📋 شروط التبادل</h3>
              <p className="text-amber-700 text-xs leading-relaxed">{exchange.terms}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

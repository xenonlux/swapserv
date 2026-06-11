import { notFound } from "next/navigation"
import { prisma } from "@/lib/db/prisma"
import { getAuthSession } from "@/lib/auth/config"
import Link from "next/link"
import {
  Star, MapPin, Globe, Calendar, CheckCircle, Repeat2,
  Briefcase, Award, ArrowLeft, UserPlus, MessageSquare
} from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

export const dynamic = "force-dynamic"

async function getProfile(username: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase(), status: "ACTIVE" },
    include: {
      skills: { include: { skill: { include: { category: true } } }, orderBy: { level: "desc" } },
      servicesOffered: {
        where: { status: "ACTIVE" },
        include: { category: true, skills: { include: { skill: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      reviewsReceived: {
        where: { isPublic: true },
        include: { giver: { select: { displayName: true, avatar: true, username: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
      _count: { select: { followers: true, following: true, servicesOffered: true } },
    },
  })

  if (!user) return null

  let isFollowing = false
  if (viewerId && viewerId !== user.id) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
    })
    isFollowing = !!follow
  }

  return { ...user, isFollowing }
}

const LEVEL_LABELS: Record<number, string> = { 1: "مبتدئ", 2: "متوسط", 3: "جيد", 4: "متقدم", 5: "خبير" }
const LEVEL_COLORS: Record<number, string> = {
  1: "bg-slate-100 text-slate-600",
  2: "bg-sky-100 text-sky-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-emerald-100 text-emerald-700",
  5: "bg-amber-100 text-amber-700",
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const session = await getAuthSession()
  const profile = await getProfile(params.username, session?.user?.id)

  if (!profile) notFound()

  const isOwn = session?.user?.id === profile.id

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Cover */}
      <div className="h-48 bg-gradient-to-br from-sky-400 via-sky-500 to-emerald-500 relative">
        {profile.coverImage && (
          <img src={profile.coverImage} alt="" className="w-full h-full object-cover absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="container -mt-16 pb-16">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left sidebar - Profile info */}
          <div className="space-y-5">
            {/* Avatar + name */}
            <div className="card pt-8 text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white font-black text-4xl mx-auto -mt-16 mb-4 border-4 border-white shadow-lg">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  profile.displayName[0]
                )}
              </div>

              <div className="flex items-center justify-center gap-2 mb-1">
                <h1 className="text-xl font-black text-slate-900">{profile.displayName}</h1>
                {profile.isIdentityVerified && (
                  <CheckCircle className="w-5 h-5 text-sky-500" />
                )}
              </div>
              <p className="text-slate-500 text-sm">@{profile.username}</p>

              {profile.bio && (
                <p className="text-slate-600 text-sm mt-3 leading-relaxed">{profile.bio}</p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-sm text-slate-500">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {profile.city}
                  </span>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-600 hover:underline">
                    <Globe className="w-3.5 h-3.5" /> موقع
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(profile.createdAt, "MMMM yyyy", { locale: ar })}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-5">
                {isOwn ? (
                  <Link href="/dashboard/profile" className="btn-outline btn-sm flex-1">
                    تعديل الملف
                  </Link>
                ) : (
                  <>
                    <button className={`btn-sm flex-1 gap-1 ${profile.isFollowing ? "btn-ghost border border-slate-200" : "btn-primary"}`}>
                      <UserPlus className="w-4 h-4" />
                      {profile.isFollowing ? "متابَع" : "متابعة"}
                    </button>
                    <Link href={`/dashboard/messages?user=${profile.id}`} className="btn-outline btn-sm px-3">
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="card">
              <div className="grid grid-cols-2 gap-4 text-center">
                {[
                  { label: "تبادلات مكتملة", value: profile.completedExchanges, icon: Repeat2, color: "text-sky-600" },
                  { label: "التقييم", value: profile.reputationScore > 0 ? `${profile.reputationScore.toFixed(1)} ★` : "—", icon: Star, color: "text-amber-600" },
                  { label: "المتابعون", value: profile._count.followers, icon: UserPlus, color: "text-emerald-600" },
                  { label: "معدل النجاح", value: `${profile.successRate}%`, icon: CheckCircle, color: "text-purple-600" },
                ].map(stat => (
                  <div key={stat.label} className="p-3 bg-slate-50 rounded-xl">
                    <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
                    <div className="font-black text-slate-900 text-lg">{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges */}
            {profile.badges.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" /> الشارات
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map(({ badge }) => (
                    <div key={badge.id} title={badge.nameAr} className="flex items-center gap-1.5 badge-warm cursor-help">
                      <span>{badge.icon}</span>
                      <span>{badge.nameAr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {profile.skills.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-sky-500" /> المهارات
                </h3>
                <div className="space-y-2">
                  {profile.skills.map(s => (
                    <div key={s.skillId} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-slate-700">{s.skill.nameAr || s.skill.name}</span>
                        {s.yearsExperience && (
                          <span className="text-xs text-slate-400 mr-1">({s.yearsExperience} سنة)</span>
                        )}
                      </div>
                      <span className={`badge text-xs ${LEVEL_COLORS[s.level]}`}>
                        {LEVEL_LABELS[s.level]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Services */}
            {profile.servicesOffered.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-sky-500" /> الخدمات المقدمة
                  </h2>
                  <Link href={`/explore?providerId=${profile.id}`} className="text-sm text-sky-600 hover:underline flex items-center gap-1">
                    الكل <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {profile.servicesOffered.map(service => (
                    <Link key={service.id} href={`/services/${service.id}`} className="card-interactive p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">{service.category?.icon || "🔧"}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 text-sm line-clamp-1">{service.title}</div>
                          <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{service.description}</div>
                          {(service.pointsMin || service.pointsMax) && (
                            <div className="points-badge text-xs mt-2">
                              {service.pointsMin}+ ⭐
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {profile.reviewsReceived.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" /> التقييمات ({profile.totalReviews})
                  </h2>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-4 h-4 ${i <= Math.round(profile.reputationScore) ? "star-filled" : "star-empty"}`} />
                    ))}
                    <span className="text-sm font-bold text-slate-700 mr-1">
                      {profile.reputationScore.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  {profile.reviewsReceived.map(review => (
                    <div key={review.id} className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white text-xs font-bold">
                            {review.giver.displayName[0]}
                          </div>
                          <div>
                            <Link href={`/profile/${review.giver.username}`} className="font-semibold text-slate-800 text-sm hover:text-sky-600">
                              {review.giver.displayName}
                            </Link>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? "star-filled" : "star-empty"}`} />
                          ))}
                        </div>
                      </div>
                      {review.title && <p className="font-semibold text-slate-700 text-sm mb-1">{review.title}</p>}
                      {review.content && <p className="text-slate-600 text-sm leading-relaxed">{review.content}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.servicesOffered.length === 0 && profile.reviewsReceived.length === 0 && (
              <div className="card text-center py-16">
                <Briefcase className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="font-bold text-slate-700 mb-2">لا يوجد محتوى بعد</h3>
                <p className="text-slate-400 text-sm">
                  {isOwn ? "ابدأ بإضافة خدماتك الأولى!" : "لم يضف هذا المستخدم خدمات بعد"}
                </p>
                {isOwn && (
                  <Link href="/dashboard/services/new" className="btn-primary btn-md mt-4 inline-flex">
                    أضف خدمتك الأولى
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

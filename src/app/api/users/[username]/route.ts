import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { ok, notFound, unauthorized, requireSession, validateBody, withErrorHandling } from "@/lib/utils/api"
import { updateProfileSchema } from "@/lib/validations/schemas"
import { Cache } from "@/lib/redis/client"

// GET /api/users/[username]
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: { username: string } }
) => {
  const session = await (await import("@/lib/auth/config")).getAuthSession()

  const cacheKey = Cache.key("profile", params.username)
  const cached = await Cache.get(cacheKey)
  if (cached) return ok(cached)

  const user = await prisma.user.findUnique({
    where: { username: params.username.toLowerCase() },
    select: {
      id: true, username: true, displayName: true, avatar: true,
      coverImage: true, bio: true, city: true, country: true,
      website: true, reputationScore: true, totalReviews: true,
      completedExchanges: true, successRate: true,
      isIdentityVerified: true, createdAt: true,
      profileVisibility: true, status: true,
      skills: {
        include: {
          skill: {
            include: { category: { select: { name: true, nameAr: true } } },
          },
        },
        orderBy: { level: "desc" },
      },
      servicesOffered: {
        where: { status: "ACTIVE" },
        include: {
          category: { select: { name: true, nameAr: true, icon: true } },
          skills: { include: { skill: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      reviewsReceived: {
        where: { isPublic: true },
        include: {
          giver: { select: { displayName: true, avatar: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      badges: {
        include: { badge: true },
        orderBy: { earnedAt: "desc" },
      },
      _count: {
        select: {
          followers: true,
          following: true,
          servicesOffered: true,
          requestsPosted: true,
        },
      },
    },
  })

  if (!user) return notFound("المستخدم غير موجود")
  if (user.status !== "ACTIVE") return notFound()

  // Check visibility
  const isOwn = session?.user?.id === user.id
  if (!isOwn && user.profileVisibility === "private") {
    return ok({ id: user.id, username: user.username, displayName: user.displayName, isPrivate: true })
  }

  // Check if viewer follows this user
  let isFollowing = false
  if (session?.user?.id && !isOwn) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
    })
    isFollowing = !!follow
  }

  const profile = {
    ...user,
    isOwn,
    isFollowing,
    skills: user.skills.map(s => ({
      skillId: s.skillId,
      skillName: s.skill.name,
      skillNameAr: s.skill.nameAr,
      categoryName: s.skill.category?.nameAr,
      level: s.level,
      yearsExperience: s.yearsExperience,
      isVerified: s.isVerified,
    })),
  }

  await Cache.set(cacheKey, profile, 300) // 5 min cache

  return ok(profile)
})

// PATCH /api/users/[username] - Update profile
export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: { username: string } }
) => {
  const { session, error: authErr } = await requireSession()
  if (authErr || !session) return authErr || unauthorized()

  if (session.user.username !== params.username) {
    return (await import("@/lib/utils/api")).forbidden()
  }

  const validation = await validateBody(req, updateProfileSchema)
  if ("error" in validation) return validation.error

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: validation.data,
    select: {
      id: true, username: true, displayName: true, avatar: true,
      bio: true, city: true, country: true, website: true,
    },
  })

  await Cache.del(Cache.key("profile", params.username))

  return ok(updated, "تم تحديث الملف الشخصي")
})

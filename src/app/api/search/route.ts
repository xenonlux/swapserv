import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { Cache } from "@/lib/redis/client"
import { ok, validateQuery, withErrorHandling } from "@/lib/utils/api"
import { searchSchema } from "@/lib/validations/schemas"

export const GET = withErrorHandling(async (req: NextRequest) => {
  const validation = validateQuery(req.nextUrl.searchParams, searchSchema)
  if ("error" in validation) return validation.error

  const { q, type, categoryId, skillIds, isRemote, city, minRating, sortBy, page, limit } = validation.data
  const skip = (page - 1) * limit

  const cacheKey = Cache.key("search", JSON.stringify(validation.data))
  const cached = await Cache.get(cacheKey)
  if (cached) return ok(cached)

  let result: Record<string, unknown> = {}

  // ---- Search Services ----
  if (type === "services") {
    const where: Record<string, unknown> = {
      status: "ACTIVE",
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { titleAr: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { hasSome: [q.toLowerCase()] } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(isRemote !== undefined && { isRemote }),
      ...(city && { city: { contains: city, mode: "insensitive" } }),
      ...(skillIds?.length && { skills: { some: { skillId: { in: skillIds } } } }),
      ...(minRating && { provider: { reputationScore: { gte: minRating } } }),
    }

    const orderBy = {
      recent: { createdAt: "desc" as const },
      rating: { avgRating: "desc" as const },
      popular: { viewCount: "desc" as const },
      points_asc: { pointsMin: "asc" as const },
      points_desc: { pointsMax: "desc" as const },
    }[sortBy] || { createdAt: "desc" as const }

    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          provider: {
            select: {
              id: true, username: true, displayName: true, avatar: true,
              reputationScore: true, totalReviews: true, isIdentityVerified: true,
              city: true, country: true,
            },
          },
          category: { select: { name: true, nameAr: true, icon: true } },
          skills: { include: { skill: { select: { name: true, nameAr: true } } } },
        },
      }),
      prisma.service.count({ where }),
    ])

    result = {
      items: items.map(s => ({ ...s, skills: s.skills.map(ss => ss.skill) })),
      total, page, limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  }

  // ---- Search Requests ----
  else if (type === "requests") {
    const where: Record<string, unknown> = {
      status: "OPEN",
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { hasSome: [q.toLowerCase()] } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(isRemote !== undefined && { isRemote }),
      ...(city && { city: { contains: city, mode: "insensitive" } }),
      ...(skillIds?.length && { skills: { some: { skillId: { in: skillIds } } } }),
    }

    const [items, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        orderBy: sortBy === "recent" ? { createdAt: "desc" } : { viewCount: "desc" },
        skip,
        take: limit,
        include: {
          poster: {
            select: {
              id: true, username: true, displayName: true, avatar: true,
              reputationScore: true, isIdentityVerified: true,
            },
          },
          category: { select: { name: true, nameAr: true, icon: true } },
          skills: {
            include: { skill: { select: { name: true, nameAr: true } } },
          },
        },
      }),
      prisma.serviceRequest.count({ where }),
    ])

    result = {
      items: items.map(r => ({ ...r, skills: r.skills.map(rs => ({ ...rs.skill, isRequired: rs.isRequired })) })),
      total, page, limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  }

  // ---- Search Users ----
  else if (type === "users") {
    const where: Record<string, unknown> = {
      status: "ACTIVE",
      profileVisibility: "public",
      ...(q && {
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(minRating && { reputationScore: { gte: minRating } }),
      ...(skillIds?.length && { skills: { some: { skillId: { in: skillIds } } } }),
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: sortBy === "rating" ? { reputationScore: "desc" } : { completedExchanges: "desc" },
        skip,
        take: limit,
        select: {
          id: true, username: true, displayName: true, avatar: true,
          bio: true, city: true, country: true, reputationScore: true,
          totalReviews: true, completedExchanges: true, successRate: true,
          isIdentityVerified: true, createdAt: true,
          skills: {
            take: 5,
            include: { skill: { select: { name: true, nameAr: true } } },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    result = {
      items,
      total, page, limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  }

  // Cache for 60 seconds
  await Cache.set(cacheKey, result, 60)

  return ok(result)
})

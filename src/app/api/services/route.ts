import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { Cache } from "@/lib/redis/client"
import {
  ok, created, error, unauthorized, notFound, serverError,
  validateBody, validateQuery, requireSession, rateLimitMiddleware,
  withErrorHandling
} from "@/lib/utils/api"
import { createServiceSchema, searchSchema } from "@/lib/validations/schemas"
import { nanoid } from "nanoid"

// ============================================================
// GET /api/services - List/Search Services
// ============================================================

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl

  const validation = validateQuery(searchParams, searchSchema)
  if ("error" in validation) return validation.error

  const { q, categoryId, skillIds, isRemote, city, sortBy, page, limit } = validation.data

  // Build cache key
  const cacheKey = Cache.key("services", JSON.stringify(validation.data))
  const cached = await Cache.get(cacheKey)
  if (cached) return ok(cached)

  const skip = (page - 1) * limit

  // Build where clause
  const where: Record<string, unknown> = {
    status: "ACTIVE",
    deletedAt: null,
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { titleAr: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { hasSome: [q] } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(isRemote !== undefined && { isRemote }),
    ...(city && { city: { contains: city, mode: "insensitive" } }),
    ...(skillIds?.length && {
      skills: { some: { skillId: { in: skillIds } } },
    }),
  }

  // Build orderBy
  const orderByMap: Record<string, unknown> = {
    recent: { createdAt: "desc" },
    rating: { avgRating: "desc" },
    popular: { viewCount: "desc" },
    points_asc: { pointsMin: "asc" },
    points_desc: { pointsMax: "desc" },
  }
  const orderBy = orderByMap[sortBy] || { createdAt: "desc" }

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            reputationScore: true,
            totalReviews: true,
            completedExchanges: true,
            isIdentityVerified: true,
            city: true,
            country: true,
          },
        },
        category: {
          select: { name: true, nameAr: true, icon: true, slug: true },
        },
        skills: {
          include: {
            skill: { select: { name: true, nameAr: true } },
          },
        },
      },
    }),
    prisma.service.count({ where }),
  ])

  const result = {
    items: services.map((s) => ({
      ...s,
      skills: s.skills.map((ss) => ss.skill),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  }

  // Cache for 2 minutes
  await Cache.set(cacheKey, result, 120)

  return ok(result)
})

// ============================================================
// POST /api/services - Create Service
// ============================================================

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Rate limit: 10 services per hour
  const { allowed, response: rlResponse } = await rateLimitMiddleware(req, {
    limit: 10,
    window: 3600,
  })
  if (!allowed) return rlResponse!

  const { session, error: authError } = await requireSession()
  if (authError || !session) return authError || unauthorized()

  const validation = await validateBody(req, createServiceSchema)
  if ("error" in validation) return validation.error

  const { skillIds, ...serviceData } = validation.data

  // Verify category exists if provided
  if (serviceData.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: serviceData.categoryId } })
    if (!cat) return error("الفئة غير موجودة", 400)
  }

  // Verify skills exist
  if (skillIds.length > 0) {
    const skillCount = await prisma.skill.count({ where: { id: { in: skillIds } } })
    if (skillCount !== skillIds.length) return error("بعض المهارات غير موجودة", 400)
  }

  const service = await prisma.service.create({
    data: {
      ...serviceData,
      providerId: session.user.id,
      status: "ACTIVE",
      slug: `${nanoid(8)}-${serviceData.title.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`,
      publishedAt: new Date(),
      skills: {
        create: skillIds.map((skillId) => ({ skillId })),
      },
    },
    include: {
      skills: { include: { skill: true } },
      category: true,
      provider: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
  })

  // Invalidate user services cache
  await Cache.delPattern(`user_services:${session.user.id}*`)
  await Cache.delPattern("services:*")

  return created(service, "تم نشر الخدمة بنجاح")
})

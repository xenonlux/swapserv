import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { Cache } from "@/lib/redis/client"
import {
  ok, created, error, unauthorized,
  validateBody, validateQuery, requireSession,
  rateLimitMiddleware, withErrorHandling
} from "@/lib/utils/api"
import { createServiceRequestSchema, searchSchema } from "@/lib/validations/schemas"

// GET /api/requests
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl
  const validation = validateQuery(searchParams, searchSchema)
  if ("error" in validation) return validation.error

  const { q, categoryId, isRemote, sortBy, page, limit } = validation.data
  const skip = (page - 1) * limit

  const cacheKey = Cache.key("requests", JSON.stringify(validation.data))
  const cached = await Cache.get(cacheKey)
  if (cached) return ok(cached)

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
  }

  const [items, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      orderBy: sortBy === "popular" ? { viewCount: "desc" } : { createdAt: "desc" },
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
        _count: { select: { exchanges: true } },
      },
    }),
    prisma.serviceRequest.count({ where }),
  ])

  const result = {
    items: items.map(r => ({
      ...r,
      skills: r.skills.map(s => ({ ...s.skill, isRequired: s.isRequired })),
      responseCount: r._count.exchanges,
    })),
    total, page, limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  }

  await Cache.set(cacheKey, result, 120)
  return ok(result)
})

// POST /api/requests
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { allowed, response: rlRes } = await rateLimitMiddleware(req, { limit: 5, window: 3600 })
  if (!allowed) return rlRes!

  const { session, error: authErr } = await requireSession()
  if (authErr || !session) return authErr || unauthorized()

  const validation = await validateBody(req, createServiceRequestSchema)
  if ("error" in validation) return validation.error

  const { skillIds, ...data } = validation.data

  const request = await prisma.serviceRequest.create({
    data: {
      ...data,
      posterId: session.user.id,
      status: "OPEN",
      expiresAt: data.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      skills: {
        create: skillIds.map(skillId => ({ skillId, isRequired: true })),
      },
    },
    include: {
      skills: { include: { skill: true } },
      category: true,
      poster: { select: { id: true, username: true, displayName: true, avatar: true } },
    },
  })

  await Cache.delPattern("requests:*")

  return created(request, "تم نشر الطلب بنجاح")
})

import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { Cache } from "@/lib/redis/client"
import {
  ok, created, error, unauthorized, forbidden, notFound,
  validateBody, requireSession, withErrorHandling
} from "@/lib/utils/api"
import { createExchangeSchema } from "@/lib/validations/schemas"

// ============================================================
// GET /api/exchanges - Get user's exchanges
// ============================================================

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { session, error: authError } = await requireSession()
  if (authError || !session) return authError || unauthorized()

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    OR: [
      { providerId: session.user.id },
      { receiverId: session.user.id },
    ],
    ...(status && { status }),
  }

  const [exchanges, total] = await Promise.all([
    prisma.exchange.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        provider: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        receiver: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        providerService: { select: { id: true, title: true, images: true } },
        receiverService: { select: { id: true, title: true, images: true } },
        milestones: { orderBy: { order: "asc" } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.exchange.count({ where }),
  ])

  return ok({
    items: exchanges,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  })
})

// ============================================================
// POST /api/exchanges - Create Exchange Request
// ============================================================

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { session, error: authError } = await requireSession()
  if (authError || !session) return authError || unauthorized()

  const validation = await validateBody(req, createExchangeSchema)
  if ("error" in validation) return validation.error

  const data = validation.data

  // Can't exchange with yourself
  if (data.receiverId === session.user.id) {
    return error("لا يمكنك إنشاء تبادل مع نفسك")
  }

  // Verify receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: data.receiverId },
    select: { id: true, status: true, displayName: true },
  })
  if (!receiver) return notFound("المستخدم غير موجود")
  if (receiver.status !== "ACTIVE") return error("لا يمكن التبادل مع هذا المستخدم")

  // Verify provider service if provided
  if (data.providerServiceId) {
    const service = await prisma.service.findUnique({
      where: { id: data.providerServiceId },
    })
    if (!service || service.providerId !== session.user.id) {
      return error("الخدمة غير موجودة أو لا تمتلكها")
    }
    if (service.status !== "ACTIVE") {
      return error("الخدمة غير متاحة حالياً")
    }
  }

  // Check points for POINTS or HYBRID exchange
  if (data.type === "POINTS" || data.type === "HYBRID") {
    if (!data.pointsAmount || data.pointsAmount <= 0) {
      return error("يجب تحديد عدد النقاط")
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { availablePoints: true },
    })

    if (!user || user.availablePoints < data.pointsAmount) {
      return error(`نقاطك غير كافية. متاح: ${user?.availablePoints || 0} نقطة`)
    }
  }

  // Verify receiver service if it's a BARTER
  if (data.type === "BARTER" && data.receiverServiceId) {
    const service = await prisma.service.findUnique({
      where: { id: data.receiverServiceId },
    })
    if (!service || service.providerId !== data.receiverId) {
      return error("الخدمة المقابلة غير صحيحة")
    }
  }

  // Check for existing pending exchange between these users
  const existingExchange = await prisma.exchange.findFirst({
    where: {
      OR: [
        { providerId: session.user.id, receiverId: data.receiverId },
        { providerId: data.receiverId, receiverId: session.user.id },
      ],
      status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
      providerServiceId: data.providerServiceId || undefined,
    },
  })
  if (existingExchange) {
    return error("يوجد بالفعل تبادل نشط بينك وبين هذا المستخدم لهذه الخدمة")
  }

  // Create exchange in transaction
  const exchange = await prisma.$transaction(async (tx) => {
    // Lock points if needed
    if ((data.type === "POINTS" || data.type === "HYBRID") && data.pointsAmount) {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          availablePoints: { decrement: data.pointsAmount },
          reservedPoints: { increment: data.pointsAmount },
        },
      })

      await tx.pointsTransaction.create({
        data: {
          userId: session.user.id,
          amount: -data.pointsAmount,
          balance: 0, // Will be updated by trigger/job
          type: "LOCKED",
          reason: `قفل نقاط لتبادل: ${data.title}`,
        },
      })
    }

    // Create the exchange
    const newExchange = await tx.exchange.create({
      data: {
        providerId: session.user.id,
        receiverId: data.receiverId,
        providerServiceId: data.providerServiceId,
        receiverServiceId: data.receiverServiceId,
        requestId: data.requestId,
        type: data.type,
        status: "PENDING",
        pointsAmount: data.pointsAmount,
        pointsLocked: !!(data.type === "POINTS" || data.type === "HYBRID"),
        title: data.title,
        description: data.description,
        terms: data.terms,
        estimatedDuration: data.estimatedDuration,
      },
      include: {
        provider: { select: { id: true, username: true, displayName: true, avatar: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatar: true } },
        providerService: { select: { id: true, title: true, images: true } },
      },
    })

    // Create system message in exchange
    await tx.message.create({
      data: {
        exchangeId: newExchange.id,
        senderId: session.user.id,
        type: "SYSTEM",
        content: `تم إرسال طلب تبادل: "${data.title}"`,
      },
    })

    // Notify receiver
    await tx.notification.create({
      data: {
        userId: data.receiverId,
        type: "EXCHANGE_REQUEST",
        title: "طلب تبادل جديد",
        titleAr: "طلب تبادل جديد",
        body: `أرسل لك ${session.user.name} طلب تبادل: "${data.title}"`,
        bodyAr: `أرسل لك ${session.user.name} طلب تبادل: "${data.title}"`,
        relatedId: newExchange.id,
        relatedType: "EXCHANGE",
        actionUrl: `/dashboard/exchanges/${newExchange.id}`,
      },
    })

    return newExchange
  })

  // Invalidate caches
  await Cache.delPattern(`exchanges:${session.user.id}*`)
  await Cache.delPattern(`exchanges:${data.receiverId}*`)

  return created(exchange, "تم إرسال طلب التبادل بنجاح")
})

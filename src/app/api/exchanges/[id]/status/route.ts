import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { ok, error, unauthorized, notFound, forbidden, requireSession, validateBody, withErrorHandling } from "@/lib/utils/api"
import { updateExchangeStatusSchema } from "@/lib/validations/schemas"
import { completeExchangePoints } from "@/lib/utils/points"

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { session, error: authErr } = await requireSession()
  if (authErr || !session) return authErr || unauthorized()

  const validation = await validateBody(req, updateExchangeStatusSchema)
  if ("error" in validation) return validation.error

  const { status, reason } = validation.data

  const exchange = await prisma.exchange.findUnique({
    where: { id: params.id },
    select: {
      id: true, status: true, providerId: true, receiverId: true,
      pointsLocked: true, pointsAmount: true, type: true,
    },
  })

  if (!exchange) return notFound("التبادل غير موجود")

  const isProvider = exchange.providerId === session.user.id
  const isReceiver = exchange.receiverId === session.user.id
  if (!isProvider && !isReceiver) return forbidden()

  // ---- Validate transitions ----
  const ALLOWED: Record<string, Record<string, boolean>> = {
    PENDING:     { ACCEPTED: isReceiver, CANCELLED: isProvider || isReceiver },
    ACCEPTED:    { IN_PROGRESS: isProvider, CANCELLED: isProvider || isReceiver },
    IN_PROGRESS: { COMPLETED: false, CANCELLED: isProvider || isReceiver },
  }

  const allowed = ALLOWED[exchange.status]?.[status]
  if (!allowed) {
    return error(`لا يمكن تغيير الحالة من "${exchange.status}" إلى "${status}"`)
  }

  const updateData: Record<string, unknown> = {
    status,
    ...(status === "IN_PROGRESS" && { startedAt: new Date() }),
    ...(status === "COMPLETED" && { completedAt: new Date() }),
    ...(status === "CANCELLED" && { cancelledAt: new Date() }),
  }

  const updated = await prisma.$transaction(async (tx) => {
    const ex = await tx.exchange.update({
      where: { id: params.id },
      data: updateData,
    })

    // Unlock points if cancelled
    if (status === "CANCELLED" && exchange.pointsLocked && exchange.pointsAmount) {
      await tx.user.update({
        where: { id: exchange.providerId },
        data: {
          availablePoints: { increment: exchange.pointsAmount },
          reservedPoints: { decrement: exchange.pointsAmount },
        },
      })
      await tx.pointsTransaction.create({
        data: {
          userId: exchange.providerId,
          amount: exchange.pointsAmount,
          balance: 0,
          type: "UNLOCKED",
          reason: `إلغاء تبادل: ${reason || "لم يذكر سبب"}`,
          relatedExchangeId: params.id,
        },
      })
    }

    // Notify other party
    const notifyUserId = isProvider ? exchange.receiverId : exchange.providerId
    const msgMap: Record<string, string> = {
      ACCEPTED: "تم قبول طلب التبادل الخاص بك",
      IN_PROGRESS: "بدأ مقدم الخدمة التنفيذ",
      CANCELLED: `تم إلغاء التبادل${reason ? `: ${reason}` : ""}`,
    }

    if (msgMap[status]) {
      await tx.notification.create({
        data: {
          userId: notifyUserId,
          type: status === "CANCELLED" ? "EXCHANGE_DISPUTED" : "EXCHANGE_ACCEPTED",
          title: msgMap[status],
          titleAr: msgMap[status],
          body: msgMap[status],
          bodyAr: msgMap[status],
          relatedId: params.id,
          relatedType: "EXCHANGE",
          actionUrl: `/dashboard/exchanges/${params.id}`,
        },
      })
    }

    return ex
  })

  // Award points on completion
  if (status === "COMPLETED") {
    await completeExchangePoints(params.id).catch(console.error)
  }

  return ok(updated, `تم تحديث حالة التبادل`)
})

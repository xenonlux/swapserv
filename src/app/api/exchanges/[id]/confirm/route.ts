import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { ok, error, unauthorized, notFound, forbidden, requireSession, withErrorHandling } from "@/lib/utils/api"
import { completeExchangePoints } from "@/lib/utils/points"

export const POST = withErrorHandling(async (
  _req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { session, error: authErr } = await requireSession()
  if (authErr || !session) return authErr || unauthorized()

  const exchange = await prisma.exchange.findUnique({
    where: { id: params.id },
    select: {
      id: true, status: true, providerId: true, receiverId: true,
      providerConfirmed: true, receiverConfirmed: true,
    },
  })

  if (!exchange) return notFound()

  const isProvider = exchange.providerId === session.user.id
  const isReceiver = exchange.receiverId === session.user.id
  if (!isProvider && !isReceiver) return forbidden()

  if (exchange.status !== "IN_PROGRESS") {
    return error("يمكن التأكيد فقط في مرحلة التنفيذ")
  }

  const alreadyConfirmed = isProvider
    ? exchange.providerConfirmed
    : exchange.receiverConfirmed

  if (alreadyConfirmed) return error("لقد أكّدت الاستلام بالفعل")

  const updateField = isProvider ? "providerConfirmed" : "receiverConfirmed"
  const tsField = isProvider ? "providerConfirmedAt" : "receiverConfirmedAt"

  const updated = await prisma.exchange.update({
    where: { id: params.id },
    data: {
      [updateField]: true,
      [tsField]: new Date(),
    },
  })

  // Both confirmed → complete
  const bothConfirmed = isProvider
    ? updated.receiverConfirmed
    : updated.providerConfirmed

  if (bothConfirmed) {
    await prisma.exchange.update({
      where: { id: params.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    })

    // Award points & update stats
    await completeExchangePoints(params.id)

    // Notify both
    const [notifyProvider, notifyReceiver] = await Promise.all([
      prisma.notification.create({
        data: {
          userId: exchange.providerId,
          type: "EXCHANGE_COMPLETED",
          title: "🎉 تم إكمال التبادل!",
          titleAr: "🎉 تم إكمال التبادل!",
          body: "تم تأكيد إكمال التبادل من الطرفين. لا تنسَ كتابة تقييمك!",
          bodyAr: "تم تأكيد إكمال التبادل من الطرفين. لا تنسَ كتابة تقييمك!",
          relatedId: params.id,
          relatedType: "EXCHANGE",
          actionUrl: `/dashboard/exchanges/${params.id}`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: exchange.receiverId,
          type: "EXCHANGE_COMPLETED",
          title: "🎉 تم إكمال التبادل!",
          titleAr: "🎉 تم إكمال التبادل!",
          body: "تم تأكيد إكمال التبادل من الطرفين. لا تنسَ كتابة تقييمك!",
          bodyAr: "تم تأكيد إكمال التبادل من الطرفين. لا تنسَ كتابة تقييمك!",
          relatedId: params.id,
          relatedType: "EXCHANGE",
          actionUrl: `/dashboard/exchanges/${params.id}`,
        },
      }),
    ])

    return ok({ completed: true, notifications: [notifyProvider.id, notifyReceiver.id] }, "🎉 تم إكمال التبادل بنجاح!")
  }

  // Notify other party to confirm
  const otherUserId = isProvider ? exchange.receiverId : exchange.providerId
  await prisma.notification.create({
    data: {
      userId: otherUserId,
      type: "EXCHANGE_COMPLETED",
      title: "يرجى تأكيد استلام الخدمة",
      titleAr: "يرجى تأكيد استلام الخدمة",
      body: "أكّد الطرف الآخر إتمام التبادل. يرجى تأكيد استلامك للخدمة.",
      bodyAr: "أكّد الطرف الآخر إتمام التبادل. يرجى تأكيد استلامك للخدمة.",
      relatedId: params.id,
      relatedType: "EXCHANGE",
      actionUrl: `/dashboard/exchanges/${params.id}`,
    },
  })

  return ok({ completed: false }, "تم تسجيل تأكيدك، في انتظار تأكيد الطرف الآخر")
})

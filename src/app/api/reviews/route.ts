import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { ok, created, error, unauthorized, requireSession, validateBody, withErrorHandling } from "@/lib/utils/api"
import { createReviewSchema } from "@/lib/validations/schemas"
import { updateReputationScore } from "@/lib/utils/points"

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { session, error: authErr } = await requireSession()
  if (authErr || !session) return authErr || unauthorized()

  const validation = await validateBody(req, createReviewSchema)
  if ("error" in validation) return validation.error

  const data = validation.data

  // Verify exchange exists and user participated
  const exchange = await prisma.exchange.findUnique({
    where: { id: data.exchangeId },
    select: { providerId: true, receiverId: true, status: true },
  })

  if (!exchange) return error("التبادل غير موجود")
  if (exchange.status !== "COMPLETED") return error("يمكن التقييم فقط بعد اكتمال التبادل")

  const isParticipant =
    exchange.providerId === session.user.id ||
    exchange.receiverId === session.user.id
  if (!isParticipant) return error("لا يمكنك تقييم هذا التبادل")

  // Check not already reviewed
  const existing = await prisma.review.findUnique({
    where: { exchangeId_giverId: { exchangeId: data.exchangeId, giverId: session.user.id } },
  })
  if (existing) return error("لقد قيّمت هذا التبادل بالفعل")

  // Receiver of the review = the other party
  const receiverId = exchange.providerId === session.user.id
    ? exchange.receiverId
    : exchange.providerId

  const review = await prisma.review.create({
    data: {
      exchangeId: data.exchangeId,
      giverId: session.user.id,
      receiverId,
      rating: data.rating,
      title: data.title,
      content: data.content,
      qualityRating: data.qualityRating,
      communicationRating: data.communicationRating,
      timelinessRating: data.timelinessRating,
    },
  })

  // Notify receiver
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "NEW_REVIEW",
      title: "تقييم جديد",
      titleAr: "تقييم جديد",
      body: `حصلت على تقييم ${data.rating} نجوم`,
      bodyAr: `حصلت على تقييم ${data.rating} نجوم`,
      relatedId: review.id,
      relatedType: "REVIEW",
      actionUrl: `/profile/${session.user.username}`,
    },
  })

  // Update reputation score async
  updateReputationScore(receiverId).catch(console.error)

  return created(review, "تم نشر تقييمك بنجاح")
})

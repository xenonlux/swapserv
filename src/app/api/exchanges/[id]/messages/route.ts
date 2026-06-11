import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { ok, unauthorized, notFound, forbidden, requireSession, withErrorHandling } from "@/lib/utils/api"

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { session, error } = await requireSession()
  if (error || !session) return error || unauthorized()

  const exchange = await prisma.exchange.findUnique({
    where: { id: params.id },
    select: { providerId: true, receiverId: true },
  })

  if (!exchange) return notFound()

  const isParticipant =
    exchange.providerId === session.user.id ||
    exchange.receiverId === session.user.id

  if (!isParticipant) return forbidden()

  const { searchParams } = req.nextUrl
  const cursor = searchParams.get("cursor")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  const messages = await prisma.message.findMany({
    where: {
      exchangeId: params.id,
      isDeleted: false,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: {
      sender: {
        select: { id: true, displayName: true, avatar: true },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          sender: { select: { displayName: true } },
        },
      },
    },
  })

  // Mark unread messages as read
  const unreadIds = messages
    .filter(m => m.senderId !== session.user.id && !m.isRead)
    .map(m => m.id)

  if (unreadIds.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadIds } },
      data: { isRead: true, readAt: new Date() },
    })
  }

  return ok({
    messages,
    nextCursor: messages.length === limit ? messages[messages.length - 1].id : null,
  })
})

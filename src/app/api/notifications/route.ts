import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { ok, unauthorized, requireSession, withErrorHandling } from "@/lib/utils/api"

// GET /api/notifications
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { session, error } = await requireSession()
  if (error || !session) return error || unauthorized()

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get("page") || "1")
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
  const onlyUnread = searchParams.get("unread") === "true"
  const skip = (page - 1) * limit

  const where = {
    userId: session.user.id,
    ...(onlyUnread && { isRead: false }),
  }

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ])

  return ok({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
    unreadCount,
  })
})

// PATCH /api/notifications - Mark all as read
export const PATCH = withErrorHandling(async (_req: NextRequest) => {
  const { session, error } = await requireSession()
  if (error || !session) return error || unauthorized()

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })

  return ok({ message: "تم تحديد جميع الإشعارات كمقروءة" })
})

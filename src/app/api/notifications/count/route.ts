import { prisma } from "@/lib/db/prisma"
import { ok, unauthorized, requireSession, withErrorHandling } from "@/lib/utils/api"

export const GET = withErrorHandling(async () => {
  const { session, error } = await requireSession()
  if (error || !session) return error || unauthorized()

  const count = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  })

  return ok({ count })
})

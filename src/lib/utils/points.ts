import { prisma } from "@/lib/db/prisma"
import { Cache } from "@/lib/redis/client"

// ============================================================
// Points System Service
// ============================================================

export const POINTS_CONFIG = {
  // Earning
  COMPLETE_EXCHANGE: 100,
  RECEIVE_5_STAR: 25,
  FIRST_SERVICE: 50,
  PROFILE_COMPLETE: 30,
  REFER_USER: 75,
  DAILY_LOGIN: 5,
  
  // Bonuses
  FAST_RESPONSE_BONUS: 10, // Respond within 1 hour
  REPEAT_EXCHANGE_BONUS: 15, // Exchange with same user again
  
  // Deductions
  CANCEL_AFTER_ACCEPT: -20,
  DISPUTE_PENALTY: -30,
  
  // Initial Points
  WELCOME_BONUS: 50,
}

// ============================================================
// Award Points to User
// ============================================================

export async function awardPoints(
  userId: string,
  amount: number,
  reason: string,
  relatedExchangeId?: string
): Promise<{ newBalance: number; transaction: { id: string } }> {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        availablePoints: { increment: amount },
        totalPoints: { increment: amount },
        lifetimePointsEarned: { increment: amount },
      },
      select: { availablePoints: true },
    })

    const transaction = await tx.pointsTransaction.create({
      data: {
        userId,
        amount,
        balance: user.availablePoints,
        type: "EARNED",
        reason,
        relatedExchangeId,
      },
    })

    // Notify user
    await tx.notification.create({
      data: {
        userId,
        type: "POINTS_RECEIVED",
        title: "نقاط جديدة!",
        titleAr: "نقاط جديدة!",
        body: `حصلت على ${amount} نقطة: ${reason}`,
        bodyAr: `حصلت على ${amount} نقطة: ${reason}`,
      },
    })

    return { newBalance: user.availablePoints, transaction }
  })

  // Invalidate user cache
  await Cache.del(Cache.key("user", userId))

  return result
}

// ============================================================
// Deduct Points from User
// ============================================================

export async function deductPoints(
  userId: string,
  amount: number,
  reason: string,
  relatedExchangeId?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { availablePoints: true },
  })

  if (!user) return { success: false, error: "المستخدم غير موجود" }
  if (user.availablePoints < amount) {
    return { success: false, error: "النقاط غير كافية" }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        availablePoints: { decrement: amount },
        lifetimePointsSpent: { increment: amount },
      },
      select: { availablePoints: true },
    })

    await tx.pointsTransaction.create({
      data: {
        userId,
        amount: -amount,
        balance: updatedUser.availablePoints,
        type: "SPENT",
        reason,
        relatedExchangeId,
      },
    })

    return updatedUser
  })

  await Cache.del(Cache.key("user", userId))

  return { success: true, newBalance: updated.availablePoints }
}

// ============================================================
// Complete Exchange - Award Points to Both Parties
// ============================================================

export async function completeExchangePoints(exchangeId: string): Promise<void> {
  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    include: {
      provider: { select: { id: true, completedExchanges: true } },
      receiver: { select: { id: true, completedExchanges: true } },
    },
  })

  if (!exchange) throw new Error("Exchange not found")
  if (exchange.status !== "COMPLETED") throw new Error("Exchange not completed")

  const tasks: Promise<unknown>[] = []

  // Award points to provider
  tasks.push(
    awardPoints(
      exchange.providerId,
      POINTS_CONFIG.COMPLETE_EXCHANGE,
      "إتمام تبادل خدمة بنجاح",
      exchangeId
    )
  )

  // Release locked points to receiver (if POINTS type)
  if (exchange.type === "POINTS" || exchange.type === "HYBRID") {
    if (exchange.pointsLocked && exchange.pointsAmount) {
      tasks.push(
        prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: exchange.providerId },
            data: {
              reservedPoints: { decrement: exchange.pointsAmount! },
            },
          })

          await tx.user.update({
            where: { id: exchange.receiverId },
            data: {
              availablePoints: { increment: exchange.pointsAmount! },
              totalPoints: { increment: exchange.pointsAmount! },
              lifetimePointsEarned: { increment: exchange.pointsAmount! },
            },
          })

          await tx.pointsTransaction.create({
            data: {
              userId: exchange.receiverId,
              amount: exchange.pointsAmount!,
              balance: 0,
              type: "UNLOCKED",
              reason: "استلام نقاط تبادل مكتمل",
              relatedExchangeId: exchangeId,
            },
          })
        })
      )
    }
  }

  // Update user stats
  tasks.push(
    prisma.user.update({
      where: { id: exchange.providerId },
      data: { completedExchanges: { increment: 1 } },
    }),
    prisma.user.update({
      where: { id: exchange.receiverId },
      data: { completedExchanges: { increment: 1 } },
    })
  )

  await Promise.all(tasks)

  // Check for first exchange badge
  for (const userId of [exchange.providerId, exchange.receiverId]) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { completedExchanges: true },
    })
    
    if (user?.completedExchanges === 1) {
      await checkAndAwardBadge(userId, "first_exchange")
    } else if (user?.completedExchanges === 10) {
      await checkAndAwardBadge(userId, "ten_exchanges")
    }
  }
}

// ============================================================
// Badge System
// ============================================================

export async function checkAndAwardBadge(
  userId: string,
  badgeSlug: string
): Promise<void> {
  const badge = await prisma.badge.findFirst({
    where: { name: badgeSlug },
  })

  if (!badge) return

  const alreadyHas = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  })

  if (alreadyHas) return

  await prisma.$transaction(async (tx) => {
    await tx.userBadge.create({
      data: { userId, badgeId: badge.id },
    })

    if (badge.points > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          availablePoints: { increment: badge.points },
          totalPoints: { increment: badge.points },
        },
      })
    }

    await tx.notification.create({
      data: {
        userId,
        type: "POINTS_RECEIVED",
        title: `🏆 شارة جديدة: ${badge.nameAr}`,
        titleAr: `🏆 شارة جديدة: ${badge.nameAr}`,
        body: `حصلت على شارة "${badge.nameAr}"! +${badge.points} نقطة`,
        bodyAr: `حصلت على شارة "${badge.nameAr}"! +${badge.points} نقطة`,
      },
    })
  })
}

// ============================================================
// Update User Reputation
// ============================================================

export async function updateReputationScore(userId: string): Promise<void> {
  const reviews = await prisma.review.findMany({
    where: { receiverId: userId, isPublic: true },
    select: { rating: true },
  })

  if (reviews.length === 0) return

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  await prisma.user.update({
    where: { id: userId },
    data: {
      reputationScore: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    },
  })

  // Update success rate
  const [completed, cancelled] = await Promise.all([
    prisma.exchange.count({
      where: {
        OR: [{ providerId: userId }, { receiverId: userId }],
        status: "COMPLETED",
      },
    }),
    prisma.exchange.count({
      where: {
        OR: [{ providerId: userId }, { receiverId: userId }],
        status: "CANCELLED",
        providerId: userId, // Only count cancels initiated by user
      },
    }),
  ])

  const total = completed + cancelled
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 100

  await prisma.user.update({
    where: { id: userId },
    data: { successRate },
  })

  await Cache.del(Cache.key("user", userId))
}

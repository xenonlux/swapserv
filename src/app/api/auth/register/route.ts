import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { hashPassword } from "@/lib/auth/config"
import { created, error, withErrorHandling, validateBody, rateLimitMiddleware } from "@/lib/utils/api"
import { registerSchema } from "@/lib/validations/schemas"
import { POINTS_CONFIG } from "@/lib/utils/points"

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Rate limit: 5 registrations per IP per hour
  const { allowed, response: rlRes } = await rateLimitMiddleware(req, { limit: 5, window: 3600 })
  if (!allowed) return rlRes!

  const validation = await validateBody(req, registerSchema)
  if ("error" in validation) return validation.error

  const { email, username, displayName, password } = validation.data

  // Check existing email
  const emailExists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (emailExists) return error("البريد الإلكتروني مستخدم بالفعل")

  // Check existing username
  const usernameExists = await prisma.user.findUnique({ where: { username: username.toLowerCase() } })
  if (usernameExists) return error("اسم المستخدم مستخدم بالفعل، جرّب اسماً آخر")

  const hashedPw = await hashPassword(password)

  // Create user + welcome bonus in transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        displayName,
        password: hashedPw,
        isEmailVerified: false,
        availablePoints: POINTS_CONFIG.WELCOME_BONUS,
        totalPoints: POINTS_CONFIG.WELCOME_BONUS,
        lifetimePointsEarned: POINTS_CONFIG.WELCOME_BONUS,
      },
    })

    // Log welcome points
    await tx.pointsTransaction.create({
      data: {
        userId: newUser.id,
        amount: POINTS_CONFIG.WELCOME_BONUS,
        balance: POINTS_CONFIG.WELCOME_BONUS,
        type: "BONUS",
        reason: "مكافأة الترحيب بالمنصة",
      },
    })

    // Welcome notification
    await tx.notification.create({
      data: {
        userId: newUser.id,
        type: "SYSTEM_ALERT",
        title: `أهلاً بك يا ${displayName}! 🎉`,
        titleAr: `أهلاً بك يا ${displayName}! 🎉`,
        body: `حصلت على ${POINTS_CONFIG.WELCOME_BONUS} نقطة ترحيبية. أضف مهاراتك وابدأ التبادل!`,
        bodyAr: `حصلت على ${POINTS_CONFIG.WELCOME_BONUS} نقطة ترحيبية. أضف مهاراتك وابدأ التبادل!`,
        actionUrl: "/dashboard/profile",
      },
    })

    return newUser
  })

  return created(
    { id: user.id, email: user.email, username: user.username },
    "تم إنشاء الحساب بنجاح"
  )
})

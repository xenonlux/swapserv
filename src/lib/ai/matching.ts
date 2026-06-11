import { prisma } from "@/lib/db/prisma"
import { Cache } from "@/lib/redis/client"

// ============================================================
// AI-Powered Matching Engine
// ============================================================

interface MatchScore {
  userId: string
  serviceId: string
  score: number
  reasons: string[]
}

interface UserNeedsAnalysis {
  skillIds: string[]
  categoryIds: string[]
  requestKeywords: string[]
}

// ============================================================
// Get Match Suggestions for a User
// ============================================================

export async function getMatchSuggestions(
  userId: string,
  limit = 10
): Promise<MatchScore[]> {
  const cacheKey = Cache.key("matches", userId)
  const cached = await Cache.get<MatchScore[]>(cacheKey)
  if (cached) return cached

  // Analyze what the user needs
  const userNeeds = await analyzeUserNeeds(userId)
  
  // Get user's offered skills
  const userSkills = await prisma.userSkill.findMany({
    where: { userId },
    select: { skillId: true, level: true },
  })
  
  const userSkillIds = userSkills.map((s) => s.skillId)

  // Find services from other users that match user needs
  const potentialMatches = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      providerId: { not: userId },
      OR: [
        ...(userNeeds.categoryIds.length > 0 ? [{
          categoryId: { in: userNeeds.categoryIds },
        }] : []),
        ...(userNeeds.skillIds.length > 0 ? [{
          skills: { some: { skillId: { in: userNeeds.skillIds } } },
        }] : []),
      ],
    },
    include: {
      provider: {
        include: {
          skills: {
            where: { skillId: { in: userSkillIds } },
          },
          requestsPosted: {
            where: {
              status: "OPEN",
              skills: userSkillIds.length > 0 ? {
                some: { skillId: { in: userSkillIds } },
              } : undefined,
            },
            take: 5,
          },
        },
      },
      skills: { include: { skill: true } },
    },
    take: 50,
  })

  // Score each match
  const scored: MatchScore[] = potentialMatches.map((service) => {
    const reasons: string[] = []
    let score = 0

    // 1. Skill overlap: provider needs what you offer
    const providerNeedsYourSkills = service.provider.requestsPosted.length > 0
    if (providerNeedsYourSkills) {
      score += 40
      reasons.push("يحتاج هذا المزود لمهاراتك")
    }

    // 2. Category match with user requests
    if (userNeeds.categoryIds.includes(service.categoryId || "")) {
      score += 25
      reasons.push("الخدمة في فئة تهمك")
    }

    // 3. Skill match with user requests
    const serviceSkillIds = service.skills.map((ss) => ss.skillId)
    const skillOverlap = serviceSkillIds.filter((id) =>
      userNeeds.skillIds.includes(id)
    ).length
    if (skillOverlap > 0) {
      score += skillOverlap * 15
      const skillNames = service.skills
        .filter((ss) => userNeeds.skillIds.includes(ss.skillId))
        .map((ss) => ss.skill.nameAr || ss.skill.name)
        .join(", ")
      reasons.push(`الخدمة تتضمن: ${skillNames}`)
    }

    // 4. Provider has skills you need
    const mutualSkillCount = service.provider.skills.length
    if (mutualSkillCount > 0) {
      score += mutualSkillCount * 10
      reasons.push("مهارات متطابقة للتبادل المثالي")
    }

    // 5. Reputation bonus
    if (service.provider.reputationScore >= 4.5) {
      score += 15
      reasons.push("تقييم ممتاز")
    } else if (service.provider.reputationScore >= 4.0) {
      score += 8
      reasons.push("تقييم جيد جداً")
    }

    // 6. Recency bonus
    const daysSincePublished = Math.floor(
      (Date.now() - service.publishedAt!.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSincePublished < 7) {
      score += 10
      reasons.push("خدمة حديثة")
    }

    return {
      userId: service.providerId,
      serviceId: service.id,
      score,
      reasons: reasons.slice(0, 3),
    }
  })

  // Sort by score and dedupe by user
  const seen = new Set<string>()
  const topMatches = scored
    .sort((a, b) => b.score - a.score)
    .filter((m) => {
      if (seen.has(m.userId)) return false
      seen.add(m.userId)
      return true
    })
    .slice(0, limit)

  // Cache for 15 minutes
  await Cache.set(cacheKey, topMatches, 900)

  return topMatches
}

// ============================================================
// Analyze What a User Needs (from their requests)
// ============================================================

async function analyzeUserNeeds(userId: string): Promise<UserNeedsAnalysis> {
  const [openRequests, savedServices] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: { posterId: userId, status: "OPEN" },
      include: {
        skills: { include: { skill: true } },
        category: true,
      },
      take: 20,
    }),
    prisma.savedService.findMany({
      where: { userId },
      include: {
        service: {
          include: {
            skills: true,
            category: true,
          },
        },
      },
      take: 20,
    }),
  ])

  const skillIds = new Set<string>()
  const categoryIds = new Set<string>()
  const keywords: string[] = []

  for (const req of openRequests) {
    req.skills.forEach((s) => skillIds.add(s.skillId))
    if (req.categoryId) categoryIds.add(req.categoryId)
    keywords.push(...req.title.split(" ").filter((w) => w.length > 3))
  }

  for (const saved of savedServices) {
    saved.service.skills.forEach((s) => skillIds.add(s.skillId))
    if (saved.service.categoryId) categoryIds.add(saved.service.categoryId)
  }

  return {
    skillIds: Array.from(skillIds),
    categoryIds: Array.from(categoryIds),
    requestKeywords: [...new Set(keywords)],
  }
}

// ============================================================
// Invalidate Match Cache
// ============================================================

export async function invalidateMatchCache(userId: string) {
  await Cache.del(Cache.key("matches", userId))
}

// ============================================================
// Calculate Compatibility Score Between Two Users
// ============================================================

export async function calculateCompatibility(
  userAId: string,
  userBId: string
): Promise<{ score: number; summary: string }> {
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userAId },
      include: {
        skills: { include: { skill: true } },
        requestsPosted: {
          where: { status: "OPEN" },
          include: { skills: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userBId },
      include: {
        skills: { include: { skill: true } },
        requestsPosted: {
          where: { status: "OPEN" },
          include: { skills: true },
        },
      },
    }),
  ])

  if (!userA || !userB) return { score: 0, summary: "لا يمكن حساب التوافق" }

  const aSkillIds = new Set(userA.skills.map((s) => s.skillId))
  const bSkillIds = new Set(userB.skills.map((s) => s.skillId))
  const aRequestSkillIds = new Set(
    userA.requestsPosted.flatMap((r) => r.skills.map((s) => s.skillId))
  )
  const bRequestSkillIds = new Set(
    userB.requestsPosted.flatMap((r) => r.skills.map((s) => s.skillId))
  )

  // A has skills B needs
  const aHasBNeeds = [...bRequestSkillIds].filter((id) => aSkillIds.has(id)).length
  // B has skills A needs
  const bHasANeeds = [...aRequestSkillIds].filter((id) => bSkillIds.has(id)).length

  const mutualValue = aHasBNeeds + bHasANeeds
  const maxPossible = Math.max(aRequestSkillIds.size + bRequestSkillIds.size, 1)
  const score = Math.min(100, Math.round((mutualValue / maxPossible) * 100))

  const summary = score >= 80
    ? "توافق ممتاز - مثاليان للتبادل!"
    : score >= 60
    ? "توافق جيد - تبادل محتمل"
    : score >= 40
    ? "توافق متوسط"
    : "توافق منخفض"

  return { score, summary }
}

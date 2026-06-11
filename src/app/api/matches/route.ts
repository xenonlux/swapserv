import { getMatchSuggestions } from "@/lib/ai/matching"
import { prisma } from "@/lib/db/prisma"
import { ok, unauthorized, requireSession, withErrorHandling } from "@/lib/utils/api"

export const GET = withErrorHandling(async () => {
  const { session, error } = await requireSession()
  if (error || !session) return error || unauthorized()

  const matches = await getMatchSuggestions(session.user.id, 12)

  if (matches.length === 0) return ok({ suggestions: [] })

  // Fetch full service data
  const serviceIds = matches.map(m => m.serviceId)
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, status: "ACTIVE" },
    include: {
      provider: {
        select: {
          id: true, username: true, displayName: true, avatar: true,
          reputationScore: true, isIdentityVerified: true,
        },
      },
      category: { select: { name: true, nameAr: true, icon: true } },
      skills: { include: { skill: { select: { name: true, nameAr: true } } } },
    },
  })

  // Merge with match scores
  const suggestions = matches
    .map(match => {
      const service = services.find(s => s.id === match.serviceId)
      if (!service) return null
      return {
        ...service,
        skills: service.skills.map(ss => ss.skill),
        matchScore: match.score,
        matchReasons: match.reasons,
      }
    })
    .filter(Boolean)

  return ok({ suggestions })
})

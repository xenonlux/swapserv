import { PrismaClient } from "@prisma/client"

// ============================================================
// Prisma Client Singleton with Connection Pooling
// ============================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty",
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// ============================================================
// Database Health Check
// ============================================================

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

// ============================================================
// Paginated Query Helper
// ============================================================

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export async function paginate<T>(
  model: {
    findMany: (args: Record<string, unknown>) => Promise<T[]>
    count: (args?: Record<string, unknown>) => Promise<number>
  },
  {
    page = 1,
    limit = 20,
    where = {},
    orderBy = {},
    include = {},
    select,
  }: {
    page?: number
    limit?: number
    where?: Record<string, unknown>
    orderBy?: Record<string, unknown>
    include?: Record<string, unknown>
    select?: Record<string, unknown>
  }
): Promise<PaginatedResult<T>> {
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      include: select ? undefined : include,
      select: select || undefined,
      skip,
      take: limit,
    }),
    model.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

export default prisma

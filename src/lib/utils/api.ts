import { NextRequest, NextResponse } from "next/server"
import { ZodSchema, ZodError } from "zod"
import { getAuthSession } from "@/lib/auth/config"
import { rateLimit } from "@/lib/redis/client"
import { ApiResponse } from "@/types"

// ============================================================
// Standard API Response Helpers
// ============================================================

export function ok<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status: 200 })
}

export function created<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status: 201 })
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function error(message: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function unauthorized(message = "غير مصرح"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export function forbidden(message = "ممنوع"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
}

export function notFound(message = "غير موجود"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status: 404 })
}

export function serverError(message = "خطأ في الخادم"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status: 500 })
}

// ============================================================
// Validation Middleware
// ============================================================

export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    return { data }
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      return { error: error(`بيانات غير صالحة: ${messages}`, 422) }
    }
    return { error: error("تنسيق البيانات غير صالح") }
  }
}

export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data: T } | { error: NextResponse } {
  try {
    const params = Object.fromEntries(searchParams.entries())
    // Parse arrays and booleans
    const parsed = Object.fromEntries(
      Object.entries(params).map(([k, v]) => {
        if (v === "true") return [k, true]
        if (v === "false") return [k, false]
        if (!isNaN(Number(v)) && v !== "") return [k, Number(v)]
        return [k, v]
      })
    )
    const data = schema.parse(parsed)
    return { data }
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      return { error: error(`معاملات غير صالحة: ${messages}`, 422) }
    }
    return { error: error("معاملات الاستعلام غير صالحة") }
  }
}

// ============================================================
// Auth Middleware
// ============================================================

export async function requireSession() {
  const session = await getAuthSession()
  if (!session?.user?.id) {
    return { session: null, error: unauthorized() }
  }
  return { session, error: null }
}

export async function requireAdminSession() {
  const { session, error: authError } = await requireSession()
  if (authError || !session) return { session: null, error: authError }
  
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return { session: null, error: forbidden("هذا الإجراء يتطلب صلاحيات المشرف") }
  }
  
  return { session, error: null }
}

// ============================================================
// Rate Limiting Middleware
// ============================================================

export async function rateLimitMiddleware(
  req: NextRequest,
  options: {
    key?: string
    limit?: number
    window?: number
  } = {}
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown"
  
  const key = options.key || `api:${ip}:${req.nextUrl.pathname}`
  const limit = options.limit || 60
  const window = options.window || 60

  const result = await rateLimit(key, limit, window)

  if (!result.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: "تم تجاوز الحد المسموح به من الطلبات" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetIn.toString(),
            "Retry-After": result.resetIn.toString(),
          },
        }
      ),
    }
  }

  return { allowed: true }
}

// ============================================================
// Route Handler Wrapper
// ============================================================

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Record<string, string> }
) => Promise<NextResponse>

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      console.error(`[API Error] ${req.method} ${req.url}:`, err)
      
      if (err instanceof Error) {
        if (err.message === "UNAUTHORIZED") return unauthorized()
        if (err.message === "FORBIDDEN") return forbidden()
        if (err.message === "NOT_FOUND") return notFound()
      }
      
      return serverError()
    }
  }
}

// ============================================================
// CORS Headers
// ============================================================

export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_URL || "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  return response
}

import { z } from "zod"

// ============================================================
// Auth Schemas
// ============================================================

export const registerSchema = z.object({
  email: z
    .string()
    .email("بريد إلكتروني غير صالح")
    .toLowerCase()
    .max(255),
  
  username: z
    .string()
    .min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
    .max(30, "اسم المستخدم يجب ألا يتجاوز 30 حرفاً")
    .regex(/^[a-zA-Z0-9_]+$/, "اسم المستخدم يحتوي على أحرف غير صالحة"),
  
  displayName: z
    .string()
    .min(2, "الاسم يجب أن يكون حرفين على الأقل")
    .max(50, "الاسم يجب ألا يتجاوز 50 حرفاً"),
  
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم"
    ),
  
  confirmPassword: z.string(),
  
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "يجب الموافقة على شروط الاستخدام" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
})

export const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  rememberMe: z.boolean().optional(),
})

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "كلمة المرور ضعيفة"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
})

// ============================================================
// User Profile Schemas
// ============================================================

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().length(2).optional(),
  website: z.string().url("رابط غير صالح").optional().nullable(),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/, "رقم هاتف غير صالح").optional().nullable(),
  language: z.enum(["ar", "en"]).optional(),
  timezone: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  profileVisibility: z.enum(["public", "followers", "private"]).optional(),
})

export const updateSkillsSchema = z.object({
  skills: z.array(z.object({
    skillId: z.string().cuid(),
    level: z.number().int().min(1).max(5),
    yearsExperience: z.number().int().min(0).max(50).optional(),
  })).max(50, "لا يمكن إضافة أكثر من 50 مهارة"),
})

// ============================================================
// Service Schemas
// ============================================================

export const createServiceSchema = z.object({
  title: z
    .string()
    .min(10, "العنوان يجب أن يكون 10 أحرف على الأقل")
    .max(150, "العنوان طويل جداً"),
  
  titleAr: z.string().max(150).optional(),
  
  description: z
    .string()
    .min(50, "الوصف يجب أن يكون 50 حرفاً على الأقل")
    .max(5000, "الوصف طويل جداً"),
  
  descriptionAr: z.string().max(5000).optional(),
  
  categoryId: z.string().cuid().optional(),
  
  type: z.enum([
    "DIGITAL", "PHYSICAL", "KNOWLEDGE", "CREATIVE", 
    "TECHNICAL", "EDUCATIONAL", "SOCIAL", "OTHER"
  ]),
  
  pointsMin: z.number().int().min(1).max(100000).optional(),
  pointsMax: z.number().int().min(1).max(100000).optional(),
  
  estimatedHours: z.number().min(0.5).max(10000).optional(),
  
  isRemote: z.boolean().default(true),
  city: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  
  tags: z.array(z.string().max(30)).max(10, "لا يمكن إضافة أكثر من 10 وسوم"),
  
  skillIds: z.array(z.string().cuid()).max(10),
  
  images: z.array(z.string().url()).max(8, "لا يمكن إضافة أكثر من 8 صور"),
}).refine(
  (data) => !data.pointsMin || !data.pointsMax || data.pointsMin <= data.pointsMax,
  { message: "الحد الأدنى يجب أن يكون أقل من الحد الأقصى", path: ["pointsMax"] }
)

export const updateServiceSchema = createServiceSchema.partial().extend({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
})

// ============================================================
// Service Request Schemas
// ============================================================

export const createServiceRequestSchema = z.object({
  title: z.string().min(10).max(150),
  
  description: z.string().min(50).max(3000),
  
  categoryId: z.string().cuid().optional(),
  
  offerDescription: z.string().max(1000).optional(),
  offerPoints: z.number().int().min(0).max(100000).optional(),
  
  isRemote: z.boolean().default(true),
  city: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  
  deadline: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  
  urgencyLevel: z.number().int().min(1).max(3).default(1),
  
  tags: z.array(z.string().max(30)).max(10),
  
  skillIds: z.array(z.string().cuid()).max(10),
})

// ============================================================
// Exchange Schemas
// ============================================================

export const createExchangeSchema = z.object({
  receiverId: z.string().cuid(),
  
  providerServiceId: z.string().cuid().optional(),
  receiverServiceId: z.string().cuid().optional(),
  requestId: z.string().cuid().optional(),
  
  type: z.enum(["BARTER", "POINTS", "HYBRID"]),
  
  pointsAmount: z.number().int().min(1).max(100000).optional(),
  
  title: z.string().min(5).max(200),
  description: z.string().max(2000).optional(),
  terms: z.string().max(5000).optional(),
  
  estimatedDuration: z.number().int().min(1).max(10000).optional(),
})

export const updateExchangeStatusSchema = z.object({
  status: z.enum([
    "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"
  ]),
  reason: z.string().max(500).optional(),
})

// ============================================================
// Message Schemas
// ============================================================

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  
  type: z.enum(["TEXT", "IMAGE", "FILE", "OFFER"]).default("TEXT"),
  
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.enum(["image", "file", "video"]),
    name: z.string().max(255),
    size: z.number().max(50 * 1024 * 1024), // 50MB max
  })).max(5).optional(),
  
  offerData: z.object({
    type: z.enum(["OFFER", "COUNTER_OFFER"]),
    description: z.string().max(1000),
    serviceId: z.string().cuid().optional(),
    pointsAmount: z.number().int().min(1).optional(),
    estimatedHours: z.number().min(0.5).optional(),
  }).optional(),
  
  replyToId: z.string().cuid().optional(),
})

// ============================================================
// Review Schemas
// ============================================================

export const createReviewSchema = z.object({
  exchangeId: z.string().cuid(),
  rating: z.number().int().min(1, "التقييم يجب أن يكون 1 على الأقل").max(5, "التقييم يجب ألا يتجاوز 5"),
  title: z.string().max(200).optional(),
  content: z.string().min(10, "المراجعة يجب أن تكون 10 أحرف على الأقل").max(3000).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  timelinessRating: z.number().int().min(1).max(5).optional(),
})

// ============================================================
// Search Schemas
// ============================================================

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  type: z.enum(["services", "requests", "users"]).default("services"),
  categoryId: z.string().cuid().optional(),
  skillIds: z.array(z.string().cuid()).optional(),
  isRemote: z.boolean().optional(),
  city: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  minRating: z.number().min(1).max(5).optional(),
  sortBy: z.enum(["recent", "rating", "popular", "points_asc", "points_desc"]).default("recent"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
})

// ============================================================
// Report Schema
// ============================================================

export const createReportSchema = z.object({
  targetId: z.string().cuid(),
  targetType: z.enum(["USER", "SERVICE", "REQUEST", "EXCHANGE", "MESSAGE"]),
  reason: z.enum(["SPAM", "FAKE_SERVICE", "INAPPROPRIATE_CONTENT", "SCAM", "HARASSMENT", "OTHER"]),
  description: z.string().min(20, "يرجى توضيح السبب بشكل أكثر تفصيلاً").max(1000),
})

// ============================================================
// Types
// ============================================================

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>
export type CreateExchangeInput = z.infer<typeof createExchangeSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type SearchInput = z.infer<typeof searchSchema>

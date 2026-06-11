// ============================================================
// SwapHub - Global TypeScript Types
// ============================================================

import { User, Service, ServiceRequest, Exchange, Review, Notification } from "@prisma/client"

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string
}

// ============================================================
// User Types
// ============================================================

export type PublicUser = Pick<
  User,
  | "id"
  | "username"
  | "displayName"
  | "avatar"
  | "bio"
  | "city"
  | "country"
  | "reputationScore"
  | "totalReviews"
  | "completedExchanges"
  | "successRate"
  | "isIdentityVerified"
  | "createdAt"
>

export interface UserProfile extends PublicUser {
  skills: UserSkillWithDetails[]
  servicesCount: number
  isFollowing?: boolean
  followersCount: number
  followingCount: number
}

export interface AuthUser {
  id: string
  email: string
  username: string
  displayName: string
  avatar?: string | null
  role: string
  availablePoints: number
  isEmailVerified: boolean
}

export interface UserSkillWithDetails {
  skillId: string
  skillName: string
  skillNameAr: string
  categoryName?: string
  level: number
  yearsExperience?: number | null
  isVerified: boolean
}

// ============================================================
// Service Types
// ============================================================

export interface ServiceWithDetails extends Omit<Service, "providerId"> {
  provider: PublicUser
  skills: { name: string; nameAr: string }[]
  category?: { name: string; nameAr: string; icon?: string | null } | null
  isSaved?: boolean
  viewerCanExchange?: boolean
}

export interface CreateServiceInput {
  title: string
  titleAr?: string
  description: string
  descriptionAr?: string
  categoryId?: string
  type: string
  pointsMin?: number
  pointsMax?: number
  estimatedHours?: number
  isRemote: boolean
  city?: string
  country?: string
  tags: string[]
  skillIds: string[]
  images: string[]
}

// ============================================================
// Request Types
// ============================================================

export interface ServiceRequestWithDetails extends Omit<ServiceRequest, "posterId"> {
  poster: PublicUser
  skills: { name: string; nameAr: string; isRequired: boolean }[]
  category?: { name: string; nameAr: string; icon?: string | null } | null
}

export interface CreateServiceRequestInput {
  title: string
  description: string
  categoryId?: string
  offerDescription?: string
  offerPoints?: number
  isRemote: boolean
  city?: string
  country?: string
  deadline?: Date
  urgencyLevel: number
  tags: string[]
  skillIds: string[]
}

// ============================================================
// Exchange Types
// ============================================================

export interface ExchangeWithDetails extends Exchange {
  provider: PublicUser
  receiver: PublicUser
  providerService?: Partial<Service> | null
  receiverService?: Partial<Service> | null
  messages?: MessageWithSender[]
  reviews?: Review[]
  milestones?: MilestoneData[]
}

export interface CreateExchangeInput {
  receiverId: string
  providerServiceId?: string
  receiverServiceId?: string
  requestId?: string
  type: "BARTER" | "POINTS" | "HYBRID"
  pointsAmount?: number
  title: string
  description?: string
  terms?: string
  estimatedDuration?: number
}

export interface ExchangeOffer {
  type: "OFFER" | "COUNTER_OFFER"
  description: string
  serviceId?: string
  pointsAmount?: number
  estimatedHours?: number
}

// ============================================================
// Message Types
// ============================================================

export interface MessageWithSender {
  id: string
  content: string
  type: string
  senderId: string
  sender: { displayName: string; avatar?: string | null }
  attachments?: AttachmentData[] | null
  offerData?: ExchangeOffer | null
  isRead: boolean
  createdAt: Date
  replyTo?: { id: string; content: string; sender: { displayName: string } } | null
}

export interface AttachmentData {
  url: string
  type: "image" | "file" | "video"
  name: string
  size: number
}

export interface SendMessageInput {
  content: string
  type?: "TEXT" | "IMAGE" | "FILE" | "OFFER"
  attachments?: AttachmentData[]
  offerData?: ExchangeOffer
  replyToId?: string
}

// ============================================================
// Review Types
// ============================================================

export interface ReviewWithDetails extends Review {
  giver: PublicUser
}

export interface CreateReviewInput {
  exchangeId: string
  rating: number
  title?: string
  content?: string
  qualityRating?: number
  communicationRating?: number
  timelinessRating?: number
}

// ============================================================
// Search Types
// ============================================================

export interface SearchParams {
  q?: string
  type?: "services" | "requests" | "users"
  categoryId?: string
  skillIds?: string[]
  isRemote?: boolean
  city?: string
  country?: string
  minRating?: number
  sortBy?: "recent" | "rating" | "popular" | "points_asc" | "points_desc"
  page?: number
  limit?: number
}

export interface SearchResults {
  services?: ServiceWithDetails[]
  requests?: ServiceRequestWithDetails[]
  users?: UserProfile[]
  total: number
  pagination: PaginationMeta
}

// ============================================================
// Notification Types
// ============================================================

export interface NotificationWithMeta extends Notification {
  isNew?: boolean
}

// ============================================================
// Points Types
// ============================================================

export interface PointsTransaction {
  id: string
  amount: number
  balance: number
  type: string
  reason: string
  createdAt: Date
}

export interface PointsSummary {
  available: number
  reserved: number
  total: number
  lifetimeEarned: number
  lifetimeSpent: number
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardStats {
  activeExchanges: number
  completedExchanges: number
  totalPoints: number
  reputationScore: number
  pendingRequests: number
  unreadMessages: number
}

// ============================================================
// Milestone Types
// ============================================================

export interface MilestoneData {
  id: string
  title: string
  description?: string | null
  dueDate?: Date | null
  isCompleted: boolean
  completedAt?: Date | null
  order: number
}

// ============================================================
// Admin Types
// ============================================================

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalServices: number
  totalExchanges: number
  completedExchanges: number
  pendingReports: number
  totalPointsInCirculation: number
}

// ============================================================
// Socket Events
// ============================================================

export interface ServerToClientEvents {
  "message:new": (message: MessageWithSender) => void
  "message:read": (data: { messageId: string; readAt: Date }) => void
  "exchange:updated": (exchange: Partial<ExchangeWithDetails>) => void
  "notification:new": (notification: NotificationWithMeta) => void
  "user:typing": (data: { userId: string; conversationId: string }) => void
  "user:online": (userId: string) => void
  "user:offline": (userId: string) => void
}

export interface ClientToServerEvents {
  "message:send": (data: { conversationId?: string; exchangeId?: string } & SendMessageInput) => void
  "message:read": (messageId: string) => void
  "typing:start": (conversationId: string) => void
  "typing:stop": (conversationId: string) => void
  "room:join": (roomId: string) => void
  "room:leave": (roomId: string) => void
}

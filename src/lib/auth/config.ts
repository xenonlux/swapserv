import { NextAuthOptions, getServerSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { Cache } from "@/lib/redis/client"

// ============================================================
// NextAuth Configuration
// ============================================================

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,  // Update session daily
  },

  pages: {
    signIn: "/auth/login",
    signUp: "/auth/register",
    error: "/auth/error",
    verifyRequest: "/auth/verify-email",
  },

  providers: [
    // ---- Credentials (Email + Password) ----
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("البريد الإلكتروني وكلمة المرور مطلوبان")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatar: true,
            password: true,
            role: true,
            status: true,
            isEmailVerified: true,
            availablePoints: true,
          },
        })

        if (!user || !user.password) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة")
        }

        if (user.status === "BANNED") {
          throw new Error("تم حظر هذا الحساب")
        }

        if (user.status === "SUSPENDED") {
          throw new Error("تم تعليق هذا الحساب مؤقتاً")
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isValidPassword) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة")
        }

        // Update last active
        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.displayName,
          image: user.avatar,
          role: user.role,
          availablePoints: user.availablePoints,
          isEmailVerified: user.isEmailVerified,
        }
      },
    }),

    // ---- Google OAuth ----
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          username: profile.email.split("@")[0],
        }
      },
    }),

    // ---- GitHub OAuth ----
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.username = (user as Record<string, unknown>).username as string
        token.role = (user as Record<string, unknown>).role as string
        token.availablePoints = (user as Record<string, unknown>).availablePoints as number
        token.isEmailVerified = (user as Record<string, unknown>).isEmailVerified as boolean
      }

      // Update session trigger
      if (trigger === "update" && session) {
        token = { ...token, ...session }
      }

      // Refresh user data from DB every hour
      if (token.id && (!token.lastRefreshed || 
          Date.now() - (token.lastRefreshed as number) > 3600000)) {
        const dbUser = await Cache.get<Record<string, unknown>>(
          Cache.key("user_jwt", token.id as string)
        ) || await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            status: true,
            availablePoints: true,
            displayName: true,
            avatar: true,
          },
        })

        if (dbUser) {
          token.role = dbUser.role as string
          token.availablePoints = dbUser.availablePoints as number
          token.lastRefreshed = Date.now()
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = token.role as string
        session.user.availablePoints = token.availablePoints as number
        session.user.isEmailVerified = token.isEmailVerified as boolean
      }
      return session
    },

    async signIn({ user, account }) {
      // Allow OAuth without email verification
      if (account?.provider !== "credentials") return true

      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { isEmailVerified: true, status: true },
      })

      if (!dbUser) return false
      if (dbUser.status === "BANNED" || dbUser.status === "SUSPENDED") {
        return false
      }

      return true
    },
  },

  events: {
    async signIn({ user, account }) {
      if (user.id) {
        await prisma.loginHistory.create({
          data: {
            userId: user.id,
            isSuccess: true,
          },
        }).catch(console.error)
        
        await Cache.setUserOnline(user.id)
      }
    },

    async signOut({ token }) {
      if (token?.id) {
        await Cache.setUserOffline(token.id as string)
        await Cache.del(Cache.key("user_jwt", token.id as string))
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
}

// ============================================================
// Server-side Auth Helpers
// ============================================================

export async function getAuthSession() {
  return getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getAuthSession()
  if (!session?.user) {
    throw new Error("UNAUTHORIZED")
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("FORBIDDEN")
  }
  return session
}

// ============================================================
// Password Utilities
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============================================================
// TypeScript Declarations
// ============================================================

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      username: string
      role: string
      availablePoints: number
      isEmailVerified: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    role: string
    availablePoints: number
    isEmailVerified: boolean
    lastRefreshed?: number
  }
}

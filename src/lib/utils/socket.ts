import { Server as HTTPServer } from "http"
import { Server as SocketIOServer, Socket } from "socket.io"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db/prisma"
import { Cache } from "@/lib/redis/client"
import { ServerToClientEvents, ClientToServerEvents } from "@/types"

// ============================================================
// Socket.io Server Setup
// ============================================================

let io: SocketIOServer | null = null

export function initSocketServer(httpServer: HTTPServer) {
  if (io) return io

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: {
        origin: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
    }
  )

  // ---- Authentication Middleware ----
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.cookie

      if (!token) {
        return next(new Error("Authentication required"))
      }

      const decoded = await getToken({
        req: socket.request as Parameters<typeof getToken>[0]["req"],
        secret: process.env.NEXTAUTH_SECRET!,
      })

      if (!decoded?.id) {
        return next(new Error("Invalid token"))
      }

      // Attach user to socket
      socket.data.userId = decoded.id as string
      socket.data.displayName = decoded.name as string

      next()
    } catch {
      next(new Error("Authentication failed"))
    }
  })

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId
    console.log(`[Socket] User connected: ${userId} (${socket.id})`)

    // Mark user as online
    await Cache.setUserOnline(userId)

    // Join personal room
    socket.join(`user:${userId}`)

    // Broadcast online status to followers
    socket.broadcast.emit("user:online", userId)

    // ---- Room Management ----
    socket.on("room:join", (roomId: string) => {
      socket.join(roomId)
      console.log(`[Socket] ${userId} joined room: ${roomId}`)
    })

    socket.on("room:leave", (roomId: string) => {
      socket.leave(roomId)
    })

    // ---- Messages ----
    socket.on("message:send", async (data) => {
      try {
        const { exchangeId, conversationId, content, type = "TEXT", attachments, replyToId } = data

        if (!content?.trim() && !attachments?.length) return

        const message = await prisma.message.create({
          data: {
            exchangeId,
            conversationId,
            senderId: userId,
            type,
            content: content?.trim() || "",
            attachments: attachments as Parameters<typeof prisma.message.create>[0]["data"]["attachments"],
            replyToId,
          },
          include: {
            sender: {
              select: { id: true, displayName: true, avatar: true },
            },
            replyTo: {
              include: {
                sender: { select: { displayName: true } },
              },
            },
          },
        })

        const roomId = exchangeId ? `exchange:${exchangeId}` : `conversation:${conversationId}`

        // Emit to all room participants
        io!.to(roomId).emit("message:new", {
          ...message,
          sender: message.sender,
        })

        // Notify receiver if they're not in the room
        if (exchangeId) {
          const exchange = await prisma.exchange.findUnique({
            where: { id: exchangeId },
            select: { providerId: true, receiverId: true },
          })

          if (exchange) {
            const receiverId = exchange.providerId === userId 
              ? exchange.receiverId 
              : exchange.providerId

            // Create notification if user not in room
            const receiverSockets = await io!.in(`user:${receiverId}`).fetchSockets()
            const isInRoom = receiverSockets.some(s => 
              [...s.rooms].includes(roomId)
            )

            if (!isInRoom) {
              await prisma.notification.create({
                data: {
                  userId: receiverId,
                  type: "NEW_MESSAGE",
                  title: "رسالة جديدة",
                  titleAr: "رسالة جديدة",
                  body: `رسالة جديدة من ${socket.data.displayName}`,
                  bodyAr: `رسالة جديدة من ${socket.data.displayName}`,
                  relatedId: exchangeId,
                  relatedType: "EXCHANGE",
                  actionUrl: `/dashboard/exchanges/${exchangeId}`,
                },
              })

              io!.to(`user:${receiverId}`).emit("notification:new", {
                id: "",
                userId: receiverId,
                type: "NEW_MESSAGE",
                title: "رسالة جديدة",
                titleAr: "رسالة جديدة",
                body: `رسالة جديدة من ${socket.data.displayName}`,
                bodyAr: `رسالة جديدة من ${socket.data.displayName}`,
                relatedId: exchangeId,
                relatedType: "EXCHANGE",
                actionUrl: `/dashboard/exchanges/${exchangeId}`,
                isRead: false,
                readAt: null,
                createdAt: new Date(),
              })
            }
          }
        }
      } catch (err) {
        console.error("[Socket] Message send error:", err)
        socket.emit("message:new", {
          id: "",
          content: "❌ فشل إرسال الرسالة",
          type: "SYSTEM",
          senderId: "system",
          sender: { displayName: "النظام", avatar: null },
          isRead: false,
          createdAt: new Date(),
        })
      }
    })

    socket.on("message:read", async (messageId: string) => {
      try {
        const message = await prisma.message.update({
          where: { id: messageId },
          data: { isRead: true, readAt: new Date() },
        })

        // Notify sender
        io!.to(`user:${message.senderId}`).emit("message:read", {
          messageId,
          readAt: message.readAt!,
        })
      } catch (err) {
        console.error("[Socket] Mark read error:", err)
      }
    })

    // ---- Typing Indicators ----
    socket.on("typing:start", (conversationId: string) => {
      socket.to(conversationId).emit("user:typing", { userId, conversationId })
    })

    socket.on("typing:stop", (_conversationId: string) => {
      // Client handles timeout
    })

    // ---- Disconnect ----
    socket.on("disconnect", async () => {
      console.log(`[Socket] User disconnected: ${userId}`)

      // Check if user has other active sockets
      const userSockets = await io!.in(`user:${userId}`).fetchSockets()

      if (userSockets.length === 0) {
        await Cache.setUserOffline(userId)
        await prisma.user.update({
          where: { id: userId },
          data: { lastActiveAt: new Date() },
        }).catch(console.error)

        socket.broadcast.emit("user:offline", userId)
      }
    })
  })

  console.log("[Socket] Server initialized")
  return io
}

export function getSocketServer() {
  return io
}

export function emitToUser(userId: string, event: keyof ServerToClientEvents, data: unknown) {
  if (!io) return
  io.to(`user:${userId}`).emit(event as string, data as Parameters<ServerToClientEvents[typeof event]>[0])
}

export function emitToExchange(exchangeId: string, event: keyof ServerToClientEvents, data: unknown) {
  if (!io) return
  io.to(`exchange:${exchangeId}`).emit(event as string, data as Parameters<ServerToClientEvents[typeof event]>[0])
}

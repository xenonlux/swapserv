"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { io, Socket } from "socket.io-client"
import { Send, Paperclip, Smile, CheckCheck, Clock, Image as ImageIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils/cn"
import type { MessageWithSender } from "@/types"

interface Props {
  exchangeId: string
  otherUser: { id: string; displayName: string; avatar?: string | null }
}

let socket: Socket | null = null

function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_URL || "", {
      transports: ["websocket"],
      reconnection: true,
    })
  }
  return socket
}

export default function ExchangeChat({ exchangeId, otherUser }: Props) {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [message, setMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["messages", exchangeId],
    queryFn: async () => {
      const res = await axios.get(`/api/exchanges/${exchangeId}/messages`)
      return res.data.data || []
    },
  })

  // Send message
  const { mutate: sendMsg, isPending } = useMutation({
    mutationFn: async (content: string) => {
      const sock = getSocket()
      sock.emit("message:send", {
        exchangeId,
        content,
        type: "TEXT",
      })
    },
    onSuccess: () => setMessage(""),
  })

  // Socket setup
  useEffect(() => {
    if (!session?.user?.id) return

    const sock = getSocket()
    sock.emit("room:join", `exchange:${exchangeId}`)

    sock.on("message:new", (msg: MessageWithSender) => {
      qc.setQueryData<MessageWithSender[]>(["messages", exchangeId], (prev = []) => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setOtherTyping(false)
    })

    sock.on("user:typing", ({ userId }: { userId: string }) => {
      if (userId !== session.user.id) {
        setOtherTyping(true)
        setTimeout(() => setOtherTyping(false), 3000)
      }
    })

    return () => {
      sock.off("message:new")
      sock.off("user:typing")
      sock.emit("room:leave", `exchange:${exchangeId}`)
    }
  }, [exchangeId, session?.user?.id, qc])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, otherTyping])

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      getSocket().emit("typing:start", `exchange:${exchangeId}`)
    }
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false)
      getSocket().emit("typing:stop", `exchange:${exchangeId}`)
    }, 2000)
  }, [exchangeId, isTyping])

  const handleSend = () => {
    const trimmed = message.trim()
    if (!trimmed || isPending) return
    sendMsg(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isMe = (senderId: string) => senderId === session?.user?.id

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-3 w-full px-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
              <div className="skeleton w-8 h-8 rounded-full shrink-0" />
              <div className={`skeleton h-12 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-64"}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white font-bold">
          {otherUser.displayName[0]}
        </div>
        <div>
          <div className="font-bold text-slate-900">{otherUser.displayName}</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="status-online" />
            متصل الآن
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-5xl mb-3">💬</div>
            <p className="font-medium">ابدأ المحادثة</p>
            <p className="text-sm mt-1">ناقش تفاصيل التبادل مع {otherUser.displayName}</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const mine = isMe(msg.senderId)
            const showAvatar = !mine && (idx === 0 || messages[idx - 1].senderId !== msg.senderId)

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5 animate-slide-up",
                  mine ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                {!mine && (
                  <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white text-xs font-bold shrink-0 self-end",
                    !showAvatar && "opacity-0"
                  )}>
                    {otherUser.displayName[0]}
                  </div>
                )}

                <div className={cn("max-w-[72%] space-y-1", mine ? "items-end" : "items-start")}>
                  {/* System message */}
                  {msg.type === "SYSTEM" ? (
                    <div className="text-center w-full">
                      <span className="badge-muted text-xs px-4">{msg.content}</span>
                    </div>
                  ) : (
                    <div className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      mine
                        ? "bg-sky-500 text-white rounded-tl-sm"
                        : "bg-slate-100 text-slate-800 rounded-tr-sm"
                    )}>
                      {msg.content}
                    </div>
                  )}

                  {/* Time + read */}
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] text-slate-400",
                    mine ? "flex-row-reverse" : "flex-row"
                  )}>
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ar })}
                    {mine && (
                      <CheckCheck className={cn("w-3.5 h-3.5", msg.isRead ? "text-sky-500" : "text-slate-300")} />
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Typing indicator */}
        {otherTyping && (
          <div className="flex gap-2.5 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white text-xs font-bold">
              {otherUser.displayName[0]}
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 flex gap-1 items-center">
              {[0, 150, 300].map(delay => (
                <span
                  key={delay}
                  className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost btn-sm p-2 shrink-0 self-end mb-0.5"
          >
            <Paperclip className="w-4.5 h-4.5 text-slate-400" />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx" />

          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); handleTyping() }}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك..."
              rows={1}
              className="input py-3 resize-none overflow-hidden leading-relaxed"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = "auto"
                t.style.height = Math.min(t.scrollHeight, 120) + "px"
              }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim() || isPending}
            className="btn-primary btn-sm p-2.5 shrink-0 self-end disabled:opacity-50"
          >
            <Send className="w-4.5 h-4.5 rtl-flip" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Enter للإرسال · Shift+Enter لسطر جديد
        </p>
      </div>
    </div>
  )
}

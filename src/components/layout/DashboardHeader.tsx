"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, Search, Plus, Menu, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"

interface Props {
  user: {
    name?: string | null
    displayName?: string | null
    availablePoints: number
  }
}

export default function DashboardHeader({ user }: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState("")

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: async () => {
      const res = await axios.get("/api/notifications/count")
      return res.data.data?.count || 0
    },
    refetchInterval: 30000,
  })

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
      {/* Page search */}
      {searchOpen ? (
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="ابحث عن خدمة أو مستخدم..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="input pr-10 py-2 text-sm"
              onKeyDown={e => {
                if (e.key === "Enter" && searchQ) {
                  window.location.href = `/explore?q=${encodeURIComponent(searchQ)}`
                }
                if (e.key === "Escape") setSearchOpen(false)
              }}
            />
          </div>
          <button onClick={() => setSearchOpen(false)} className="btn-ghost btn-sm p-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setSearchOpen(true)}
            className="btn-ghost btn-sm gap-2 text-slate-500"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">بحث...</span>
          </button>

          <div className="flex-1" />
        </>
      )}

      {/* Actions */}
      {!searchOpen && (
        <div className="flex items-center gap-3">
          {/* Points */}
          <div className="points-badge hidden sm:flex">
            ⭐ {user.availablePoints.toLocaleString("ar-SA")}
          </div>

          {/* Add service */}
          <Link href="/dashboard/services/new" className="btn-primary btn-sm gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">أضف خدمة</span>
          </Link>

          {/* Notifications */}
          <Link href="/dashboard/notifications" className="relative btn-ghost btn-sm p-2">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
      )}
    </header>
  )
}

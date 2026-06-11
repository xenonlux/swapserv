"use client"

import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import Link from "next/link"
import {
  Search, Filter, Grid3X3, List, MapPin, Star,
  Clock, Repeat2, Zap, ChevronDown, X, SlidersHorizontal
} from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"

const SERVICE_TYPES = [
  { value: "", label: "الكل" },
  { value: "DIGITAL", label: "رقمية" },
  { value: "KNOWLEDGE", label: "معرفة" },
  { value: "CREATIVE", label: "إبداعية" },
  { value: "TECHNICAL", label: "تقنية" },
  { value: "EDUCATIONAL", label: "تعليمية" },
  { value: "PHYSICAL", label: "يدوية" },
]

const SORT_OPTIONS = [
  { value: "recent", label: "الأحدث" },
  { value: "rating", label: "الأعلى تقييماً" },
  { value: "popular", label: "الأكثر مشاهدة" },
  { value: "points_asc", label: "النقاط: من الأقل" },
  { value: "points_desc", label: "النقاط: من الأكثر" },
]

const TABS = [
  { value: "services", label: "الخدمات", icon: Zap },
  { value: "requests", label: "الطلبات", icon: Repeat2 },
]

interface ServiceCard {
  id: string
  title: string
  description: string
  provider: {
    displayName: string
    avatar?: string
    reputationScore: number
    city?: string
    country: string
    isIdentityVerified: boolean
  }
  category?: { name: string; nameAr: string; icon?: string }
  skills: { nameAr: string; name: string }[]
  pointsMin?: number
  pointsMax?: number
  isRemote: boolean
  city?: string
  images: string[]
  avgRating?: number
  viewCount: number
  exchangeCount: number
  createdAt: string
}

function ServiceCardComponent({ service, view }: { service: ServiceCard; view: "grid" | "list" }) {
  if (view === "list") {
    return (
      <Link href={`/services/${service.id}`} className="card-interactive flex gap-5">
        {/* Image */}
        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
          {service.images[0] ? (
            <img src={service.images[0]} alt={service.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">{service.category?.icon || "🔧"}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {service.category && (
                  <span className="badge-muted text-xs">{service.category.nameAr}</span>
                )}
                {service.isRemote && <span className="badge-accent text-xs">عن بُعد</span>}
              </div>
              <h3 className="font-bold text-slate-900 truncate">{service.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mt-1">{service.description}</p>
            </div>
            {(service.pointsMin || service.pointsMax) && (
              <div className="points-badge shrink-0">
                {service.pointsMin && service.pointsMax
                  ? `${service.pointsMin}–${service.pointsMax}`
                  : service.pointsMin || service.pointsMax} ⭐
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white text-xs font-bold">
                {service.provider.displayName[0]}
              </div>
              <span className="text-sm text-slate-600">{service.provider.displayName}</span>
              {service.provider.isIdentityVerified && <span className="text-sky-500 text-xs">✓</span>}
            </div>
            {service.provider.reputationScore > 0 && (
              <div className="flex items-center gap-1 text-sm text-amber-600">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {service.provider.reputationScore.toFixed(1)}
              </div>
            )}
            {service.city && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="w-3 h-3" /> {service.city}
              </div>
            )}
            <div className="mr-auto flex items-center gap-1 text-xs text-slate-400">
              <Repeat2 className="w-3 h-3" /> {service.exchangeCount}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/services/${service.id}`} className="card-interactive flex flex-col">
      {/* Image */}
      <div className="w-full h-40 rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center overflow-hidden mb-4">
        {service.images[0] ? (
          <img src={service.images[0]} alt={service.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{service.category?.icon || "🔧"}</span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        {service.category && (
          <span className="badge-muted text-xs">{service.category.nameAr}</span>
        )}
        {service.isRemote && <span className="badge-accent text-xs">عن بُعد</span>}
      </div>

      <h3 className="font-bold text-slate-900 line-clamp-2 mb-2">{service.title}</h3>
      <p className="text-sm text-slate-500 line-clamp-3 flex-1">{service.description}</p>

      {/* Skills */}
      {service.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {service.skills.slice(0, 3).map((sk) => (
            <span key={sk.name} className="badge-muted text-xs">{sk.nameAr || sk.name}</span>
          ))}
          {service.skills.length > 3 && (
            <span className="badge-muted text-xs">+{service.skills.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white text-xs font-bold">
            {service.provider.displayName[0]}
          </div>
          <span className="text-sm text-slate-600 font-medium">{service.provider.displayName}</span>
        </div>
        <div className="flex items-center gap-2">
          {service.provider.reputationScore > 0 && (
            <span className="text-xs text-amber-600 font-semibold flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400" />
              {service.provider.reputationScore.toFixed(1)}
            </span>
          )}
          {(service.pointsMin || service.pointsMax) && (
            <span className="points-badge text-xs">
              {service.pointsMin}+ ⭐
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function ExplorePage() {
  const [tab, setTab] = useState("services")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [q, setQ] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [type, setType] = useState("")
  const [isRemote, setIsRemote] = useState<boolean | undefined>()
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const debouncedQ = useDebounce(q, 400)

  const { data, isLoading } = useQuery({
    queryKey: ["explore", tab, debouncedQ, sortBy, type, isRemote, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: tab,
        sortBy,
        page: page.toString(),
        limit: "20",
        ...(debouncedQ && { q: debouncedQ }),
        ...(type && { serviceType: type }),
        ...(isRemote !== undefined && { isRemote: String(isRemote) }),
      })
      const endpoint = tab === "services" ? "/api/services" : "/api/requests"
      const res = await axios.get(`${endpoint}?${params}`)
      return res.data.data
    },
  })

  const clearFilters = useCallback(() => {
    setQ("")
    setType("")
    setIsRemote(undefined)
    setSortBy("recent")
    setPage(1)
  }, [])

  const hasFilters = q || type || isRemote !== undefined

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="container py-4">
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={tab === "services" ? "ابحث عن خدمة..." : "ابحث عن طلب..."}
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1) }}
              className="input pr-12 text-base"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute left-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            )}
          </div>

          {/* Tabs + Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {TABS.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setTab(t.value); setPage(1) }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    tab === t.value
                      ? "bg-white text-sky-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mr-auto">
              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value); setPage(1) }}
                  className="input py-2 pr-3 pl-7 text-sm appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-sm ${showFilters ? "btn-primary" : "btn-outline"} gap-1.5`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                فلترة
                {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>

              {/* View toggle */}
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setView("grid")}
                  className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-white shadow-sm text-sky-600" : "text-slate-400"}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-white shadow-sm text-sky-600" : "text-slate-400"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-4 animate-slide-up">
              {/* Service type */}
              <div>
                <label className="label text-xs mb-1">نوع الخدمة</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { setType(type === t.value ? "" : t.value); setPage(1) }}
                      className={`badge cursor-pointer transition-colors ${
                        type === t.value ? "badge-primary" : "badge-muted hover:badge-primary"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remote */}
              <div>
                <label className="label text-xs mb-1">الموقع</label>
                <div className="flex gap-2">
                  {[
                    { v: undefined, label: "الكل" },
                    { v: true, label: "عن بُعد" },
                    { v: false, label: "حضوري" },
                  ].map(opt => (
                    <button
                      key={String(opt.v)}
                      onClick={() => { setIsRemote(opt.v); setPage(1) }}
                      className={`badge cursor-pointer transition-colors ${
                        isRemote === opt.v ? "badge-accent" : "badge-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasFilters && (
                <button onClick={clearFilters} className="mr-auto btn-ghost btn-sm text-red-500 hover:bg-red-50">
                  <X className="w-4 h-4" /> مسح الفلاتر
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container py-8">
        {isLoading ? (
          <div className={`grid gap-4 ${view === "grid" ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`skeleton ${view === "grid" ? "h-72" : "h-28"}`} />
            ))}
          </div>
        ) : !data?.items?.length ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد نتائج</h3>
            <p className="text-slate-400 mb-6">جرّب تغيير كلمات البحث أو الفلاتر</p>
            <button onClick={clearFilters} className="btn-outline btn-md">
              مسح الفلاتر
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                {data.total.toLocaleString("ar-SA")} نتيجة
              </p>
            </div>

            <div className={`grid gap-4 ${view === "grid"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1"
            }`}>
              {data.items.map((service: ServiceCard) => (
                <ServiceCardComponent key={service.id} service={service} view={view} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!data.hasPrev}
                  className="btn-outline btn-sm disabled:opacity-40"
                >
                  السابق
                </button>
                <span className="text-sm text-slate-600 px-4">
                  صفحة {page} من {data.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.hasNext}
                  className="btn-outline btn-sm disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

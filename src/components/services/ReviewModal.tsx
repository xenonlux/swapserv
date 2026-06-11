"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import axios from "axios"
import toast from "react-hot-toast"
import { Star, X, Loader2, CheckCircle } from "lucide-react"

interface Props {
  exchangeId: string
  onClose: () => void
  onSuccess: () => void
}

const ASPECTS = [
  { key: "qualityRating", label: "جودة العمل" },
  { key: "communicationRating", label: "التواصل" },
  { key: "timelinessRating", label: "الالتزام بالوقت" },
]

function StarRating({
  value, onChange, size = "md"
}: {
  value: number; onChange: (v: number) => void; size?: "sm" | "md"
}) {
  const [hovered, setHovered] = useState(0)
  const sz = size === "sm" ? "w-5 h-5" : "w-8 h-8"

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`${sz} transition-colors ${
              i <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300 fill-slate-100"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

const LABELS: Record<number, string> = {
  1: "سيء", 2: "مقبول", 3: "جيد", 4: "جيد جداً", 5: "ممتاز"
}

export default function ReviewModal({ exchangeId, onClose, onSuccess }: Props) {
  const [rating, setRating] = useState(0)
  const [subRatings, setSubRatings] = useState({ qualityRating: 0, communicationRating: 0, timelinessRating: 0 })
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/reviews", {
        exchangeId,
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
        ...Object.fromEntries(
          Object.entries(subRatings).filter(([, v]) => v > 0)
        ),
      })
    },
    onSuccess: () => {
      setSubmitted(true)
      toast.success("شكراً على تقييمك!")
      setTimeout(onSuccess, 1500)
    },
    onError: () => toast.error("حدث خطأ، حاول مجدداً"),
  })

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-lg">تقييم التبادل</h2>
          <button onClick={onClose} className="btn-ghost btn-sm p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">شكراً جزيلاً!</h3>
            <p className="text-slate-500">تقييمك يساعد المجتمع على الثقة بالمنصة</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Overall rating */}
            <div className="text-center">
              <p className="text-slate-600 font-medium mb-3">كيف كانت تجربتك؟</p>
              <div className="flex justify-center mb-2">
                <StarRating value={rating} onChange={setRating} />
              </div>
              {rating > 0 && (
                <p className="text-amber-600 font-semibold text-sm">{LABELS[rating]}</p>
              )}
            </div>

            {/* Sub-ratings */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
              {ASPECTS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{label}</span>
                  <StarRating
                    value={subRatings[key as keyof typeof subRatings]}
                    onChange={v => setSubRatings(p => ({ ...p, [key]: v }))}
                    size="sm"
                  />
                </div>
              ))}
            </div>

            {/* Title */}
            <div>
              <label className="label">عنوان التقييم (اختياري)</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="خدمة احترافية ومميزة..."
                className="input"
                maxLength={200}
              />
            </div>

            {/* Content */}
            <div>
              <label className="label">تفاصيل التقييم (اختياري)</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="شارك تجربتك بالتفصيل لتساعد الآخرين..."
                className="input resize-none h-28"
                maxLength={3000}
              />
              <p className="text-xs text-slate-400 mt-1">{content.length}/3000</p>
            </div>

            <button
              onClick={() => mutate()}
              disabled={rating === 0 || isPending}
              className="btn-primary btn-md w-full gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Star className="w-4 h-4" />
              )}
              نشر التقييم
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

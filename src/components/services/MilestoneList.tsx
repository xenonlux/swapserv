"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import toast from "react-hot-toast"
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

interface Milestone {
  id: string
  title: string
  description?: string | null
  dueDate?: Date | null
  isCompleted: boolean
  completedAt?: Date | null
  order: number
}

interface Props {
  milestones: Milestone[]
  exchangeId: string
  canEdit: boolean
}

export default function MilestoneList({ milestones, exchangeId, canEdit }: Props) {
  const qc = useQueryClient()

  const toggle = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      await axios.patch(`/api/exchanges/${exchangeId}/milestones/${id}`, { isCompleted })
    },
    onSuccess: () => {
      toast.success("تم تحديث المرحلة")
      qc.invalidateQueries({ queryKey: ["exchange", exchangeId] })
    },
    onError: () => toast.error("حدث خطأ"),
  })

  const completed = milestones.filter(m => m.isCompleted).length
  const progress = milestones.length > 0 ? (completed / milestones.length) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-slate-600">{completed} من {milestones.length} مراحل</span>
        <span className="font-bold text-emerald-600">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {milestones.map((m, idx) => (
        <div
          key={m.id}
          className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
            m.isCompleted ? "bg-emerald-50" : "bg-slate-50"
          }`}
        >
          {/* Toggle */}
          <button
            onClick={() => canEdit && toggle.mutate({ id: m.id, isCompleted: !m.isCompleted })}
            disabled={!canEdit || toggle.isPending}
            className={`mt-0.5 shrink-0 ${!canEdit ? "cursor-default" : "cursor-pointer"}`}
          >
            {toggle.isPending ? (
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            ) : m.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5 text-slate-300" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className={`font-semibold text-sm ${m.isCompleted ? "line-through text-slate-400" : "text-slate-800"}`}>
              {m.order + 1}. {m.title}
            </div>
            {m.description && (
              <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              {m.dueDate && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(m.dueDate), { addSuffix: true, locale: ar })}
                </span>
              )}
              {m.isCompleted && m.completedAt && (
                <span className="text-xs text-emerald-600">
                  ✓ أُكمل {formatDistanceToNow(new Date(m.completedAt), { addSuffix: true, locale: ar })}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

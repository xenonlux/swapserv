"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
  CheckCircle, XCircle, PlayCircle, Flag,
  Star, AlertTriangle, Loader2
} from "lucide-react"
import ReviewModal from "./ReviewModal"

interface ExchangeData {
  id: string
  status: string
  providerId: string
  receiverId: string
  providerConfirmed: boolean
  receiverConfirmed: boolean
  type: string
  pointsAmount?: number | null
}

interface Props {
  exchange: ExchangeData
  myRole: "provider" | "receiver"
  canReview: boolean
}

export default function ExchangeActions({ exchange, myRole, canReview }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const [showReview, setShowReview] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")

  const updateStatus = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      await axios.patch(`/api/exchanges/${exchange.id}/status`, { status, reason })
    },
    onSuccess: (_, vars) => {
      const messages: Record<string, string> = {
        ACCEPTED: "✅ تم قبول التبادل",
        IN_PROGRESS: "🚀 بدأ التنفيذ",
        COMPLETED: "🎉 تم إكمال التبادل بنجاح!",
        CANCELLED: "❌ تم إلغاء التبادل",
      }
      toast.success(messages[vars.status] || "تم التحديث")
      qc.invalidateQueries({ queryKey: ["exchange", exchange.id] })
      router.refresh()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || "حدث خطأ، حاول مجدداً")
    },
  })

  const confirmCompletion = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/exchanges/${exchange.id}/confirm`)
    },
    onSuccess: () => {
      toast.success("✅ تم تأكيد الاستلام")
      router.refresh()
    },
    onError: () => toast.error("حدث خطأ"),
  })

  const submitDispute = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/exchanges/${exchange.id}/dispute`, {
        reason: disputeReason,
      })
    },
    onSuccess: () => {
      toast.success("تم رفع النزاع، سيتولى الفريق المراجعة")
      setShowDispute(false)
      router.refresh()
    },
    onError: () => toast.error("حدث خطأ"),
  })

  const isLoading = updateStatus.isPending || confirmCompletion.isPending

  const myConfirmed = myRole === "provider"
    ? exchange.providerConfirmed
    : exchange.receiverConfirmed

  // ---- Render actions by status + role ----
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* PENDING: Receiver can accept/reject */}
        {exchange.status === "PENDING" && myRole === "receiver" && (
          <>
            <button
              onClick={() => updateStatus.mutate({ status: "ACCEPTED" })}
              disabled={isLoading}
              className="btn-accent btn-sm gap-1.5"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              قبول التبادل
            </button>
            <button
              onClick={() => updateStatus.mutate({ status: "CANCELLED" })}
              disabled={isLoading}
              className="btn-danger btn-sm gap-1.5"
            >
              <XCircle className="w-4 h-4" /> رفض
            </button>
          </>
        )}

        {/* PENDING: Provider can cancel */}
        {exchange.status === "PENDING" && myRole === "provider" && (
          <button
            onClick={() => updateStatus.mutate({ status: "CANCELLED" })}
            disabled={isLoading}
            className="btn-ghost btn-sm gap-1.5 text-red-500 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4" /> إلغاء الطلب
          </button>
        )}

        {/* ACCEPTED: Provider starts work */}
        {exchange.status === "ACCEPTED" && myRole === "provider" && (
          <button
            onClick={() => updateStatus.mutate({ status: "IN_PROGRESS" })}
            disabled={isLoading}
            className="btn-primary btn-sm gap-1.5"
          >
            <PlayCircle className="w-4 h-4" /> ابدأ التنفيذ
          </button>
        )}

        {/* IN_PROGRESS: Confirm completion */}
        {exchange.status === "IN_PROGRESS" && !myConfirmed && (
          <button
            onClick={() => confirmCompletion.mutate()}
            disabled={isLoading}
            className="btn-accent btn-sm gap-1.5"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            تأكيد الاستلام
          </button>
        )}

        {exchange.status === "IN_PROGRESS" && myConfirmed && (
          <div className="badge-accent text-sm">
            <CheckCircle className="w-3.5 h-3.5" /> أكّدت الاستلام، بانتظار الطرف الآخر
          </div>
        )}

        {/* Dispute */}
        {["IN_PROGRESS", "ACCEPTED"].includes(exchange.status) && !exchange.isDisputed && (
          <button
            onClick={() => setShowDispute(true)}
            className="btn-ghost btn-sm gap-1.5 text-red-500 hover:bg-red-50"
          >
            <Flag className="w-4 h-4" /> إبلاغ عن مشكلة
          </button>
        )}

        {/* Review */}
        {canReview && (
          <button
            onClick={() => setShowReview(true)}
            className="btn-sm btn-outline gap-1.5"
          >
            <Star className="w-4 h-4" /> اكتب تقييماً
          </button>
        )}
      </div>

      {/* Dispute Modal */}
      {showDispute && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDispute(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="font-bold text-slate-900 text-lg">إبلاغ عن مشكلة</h2>
            </div>
            <p className="text-slate-500 text-sm mb-4">
              سيتم تعليق التبادل وسيراجع فريقنا المشكلة خلال 24 ساعة.
            </p>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              placeholder="اشرح المشكلة بالتفصيل..."
              className="input resize-none h-32 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => submitDispute.mutate()}
                disabled={!disputeReason.trim() || submitDispute.isPending}
                className="btn-danger btn-md flex-1"
              >
                {submitDispute.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال البلاغ"}
              </button>
              <button onClick={() => setShowDispute(false)} className="btn-ghost btn-md flex-1">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <ReviewModal
          exchangeId={exchange.id}
          onClose={() => setShowReview(false)}
          onSuccess={() => { setShowReview(false); router.refresh() }}
        />
      )}
    </>
  )
}

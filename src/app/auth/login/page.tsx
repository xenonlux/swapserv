"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import toast from "react-hot-toast"
import { Repeat2, Eye, EyeOff, Loader2 } from "lucide-react"
import { loginSchema, type LoginInput } from "@/lib/validations/schemas"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error === "CredentialsSignin" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : result.error)
      } else if (result?.ok) {
        toast.success("مرحباً بعودتك! 👋")
        router.push(callbackUrl)
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl">
            <span className="w-10 h-10 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Repeat2 className="w-5 h-5 text-white" />
            </span>
            <span className="gradient-text">SwapHub</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 mt-4">تسجيل الدخول</h1>
          <p className="text-slate-500 mt-1">أهلاً بعودتك 👋</p>
        </div>

        <div className="card shadow-lg">
          {/* Social */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => signIn("google", { callbackUrl })} className="btn-outline btn-md text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button onClick={() => signIn("github", { callbackUrl })} className="btn-outline btn-md text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm text-slate-400">أو بالبريد الإلكتروني</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input {...register("email")} type="email" className={`input ${errors.email ? "input-error" : ""}`} placeholder="example@email.com" dir="ltr" autoComplete="email" />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">كلمة المرور</label>
                <Link href="/auth/forgot-password" className="text-xs text-sky-600 hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <input {...register("password")} type={showPw ? "text" : "password"} className={`input pl-10 ${errors.password ? "input-error" : ""}`} placeholder="••••••••" dir="ltr" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تسجيل الدخول"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            ليس لديك حساب؟{" "}
            <Link href="/auth/register" className="text-sky-600 font-semibold hover:underline">
              إنشاء حساب مجاني
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

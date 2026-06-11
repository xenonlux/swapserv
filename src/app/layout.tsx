import type { Metadata, Viewport } from "next"
import { Cairo, Inter } from "next/font/google"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import SessionProvider from "@/components/shared/SessionProvider"
import QueryProvider from "@/components/shared/QueryProvider"
import { Toaster } from "react-hot-toast"
import "@/styles/globals.css"

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "900"],
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "SwapHub - تبادل الخدمات المجتمعي",
    template: "%s | SwapHub",
  },
  description:
    "منصة مجتمعية لتبادل الخدمات بدون مقابل مادي. شارك مهاراتك واحصل على ما تحتاجه من الآخرين.",
  keywords: ["تبادل خدمات", "مهارات", "مجتمع", "بدون مال", "تطوع", "مساعدة متبادلة"],
  authors: [{ name: "SwapHub Team" }],
  creator: "SwapHub",
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: process.env.NEXT_PUBLIC_URL,
    siteName: "SwapHub",
    title: "SwapHub - تبادل الخدمات المجتمعي",
    description: "شارك مهاراتك، اكتسب خدمات، ابنِ مجتمعاً أقوى",
  },
  twitter: {
    card: "summary_large_image",
    title: "SwapHub",
    description: "منصة تبادل الخدمات المجتمعية",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#0EA5E9",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-background font-cairo antialiased">
        <SessionProvider session={session}>
          <QueryProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: "var(--font-cairo)",
                  direction: "rtl",
                  borderRadius: "12px",
                },
                success: {
                  iconTheme: { primary: "#10B981", secondary: "white" },
                },
                error: {
                  iconTheme: { primary: "#EF4444", secondary: "white" },
                },
              }}
            />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

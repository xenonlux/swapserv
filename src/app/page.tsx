import Link from "next/link"
import { ArrowLeft, Repeat2, Star, Users, Zap, Shield, Globe, TrendingUp } from "lucide-react"

// ============================================================
// Landing Page - SwapHub
// ============================================================

const STATS = [
  { label: "خدمة متاحة", value: "12,000+", icon: Zap },
  { label: "تبادل مكتمل", value: "45,000+", icon: Repeat2 },
  { label: "عضو نشط", value: "8,000+", icon: Users },
  { label: "تقييم متوسط", value: "4.8/5", icon: Star },
]

const HOW_IT_WORKS = [
  {
    step: "١",
    title: "أنشئ ملفك الشخصي",
    desc: "سجّل مهاراتك وما تستطيع تقديمه للمجتمع - من البرمجة والتصميم إلى الطبخ والنجارة.",
    color: "bg-sky-50 text-sky-600",
  },
  {
    step: "٢",
    title: "انشر خدمتك أو طلبك",
    desc: "اعرض ما لديك أو انشر ما تحتاجه. يتصفح الجميع ويبحثون بحرية تامة.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    step: "٣",
    title: "تبادل وانمُ",
    desc: "تبادل مباشر خدمة بخدمة، أو استخدم نظام النقاط لمرونة أكبر في التعاملات.",
    color: "bg-amber-50 text-amber-600",
  },
]

const CATEGORIES = [
  { name: "تقنية وبرمجة", icon: "💻", count: "2,400+" },
  { name: "تصميم وإبداع", icon: "🎨", count: "1,800+" },
  { name: "تعليم وتدريب", icon: "📚", count: "3,200+" },
  { name: "خدمات منزلية", icon: "🏠", count: "1,500+" },
  { name: "صحة ورياضة", icon: "🏋️", count: "900+" },
  { name: "أعمال وتسويق", icon: "📈", count: "1,200+" },
  { name: "فنون وموسيقى", icon: "🎵", count: "750+" },
  { name: "لغات وترجمة", icon: "🌍", count: "1,100+" },
]

const TESTIMONIALS = [
  {
    name: "أحمد الشمري",
    role: "مطور برمجيات",
    avatar: "أ",
    color: "bg-sky-500",
    text: "تبادلت مهاراتي في البرمجة مقابل دروس في اللغة الإنجليزية. المنصة غيّرت طريقة تفكيري في التعاون!",
    rating: 5,
  },
  {
    name: "سارة المالكي",
    role: "مصممة جرافيك",
    avatar: "س",
    color: "bg-emerald-500",
    text: "أفضل منصة لبناء علاقات مهنية حقيقية. حصلت على مساعدة في المحاسبة مقابل تصميم هوية بصرية.",
    rating: 5,
  },
  {
    name: "خالد العتيبي",
    role: "معلم رياضيات",
    avatar: "خ",
    color: "bg-amber-500",
    text: "أشارك معرفتي وأتعلم مهارات جديدة في نفس الوقت. المجتمع هنا متعاون ومحترم جداً.",
    rating: 5,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* ---- Header ---- */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-black text-xl">
            <span className="w-8 h-8 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Repeat2 className="w-4 h-4 text-white" />
            </span>
            <span className="gradient-text">SwapHub</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/explore" className="hover:text-sky-600 transition-colors">استكشف</Link>
            <Link href="/explore?type=requests" className="hover:text-sky-600 transition-colors">الطلبات</Link>
            <Link href="/how-it-works" className="hover:text-sky-600 transition-colors">كيف يعمل؟</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-ghost btn-sm">تسجيل الدخول</Link>
            <Link href="/auth/register" className="btn-primary btn-sm">ابدأ مجاناً</Link>
          </div>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="hero-gradient pt-20 pb-28 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-20 right-10 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" />
        </div>

        <div className="container relative text-center">
          <div className="inline-flex items-center gap-2 badge-accent mb-8 animate-fade-in">
            <Globe className="w-3.5 h-3.5" />
            منصة مجتمعية 100% مجانية
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 leading-tight animate-slide-up">
            شارك مهاراتك
            <br />
            <span className="gradient-text">احصل على ما تحتاجه</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            تبادل الخدمات مباشرة بدون مقابل مادي. بناء مجتمع يعتمد على التعاون والمهارات، لا المال.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link href="/auth/register" className="btn-primary btn-lg w-full sm:w-auto">
              ابدأ التبادل مجاناً
              <ArrowLeft className="w-5 h-5 rtl-flip" />
            </Link>
            <Link href="/explore" className="btn-outline btn-lg w-full sm:w-auto">
              استكشف الخدمات
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            {STATS.map((stat) => (
              <div key={stat.label} className="card text-center py-6">
                <stat.icon className="w-6 h-6 text-sky-500 mx-auto mb-2" />
                <div className="text-3xl font-black text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- How It Works ---- */}
      <section className="section bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">كيف يعمل SwapHub؟</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              ثلاث خطوات بسيطة تفصلك عن بناء شبكة تبادل قوية
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="card text-center group">
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Categories ---- */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-slate-900 mb-4">تصفّح حسب الفئة</h2>
            <p className="text-slate-500">آلاف الخدمات في كل المجالات</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={`/explore?category=${encodeURIComponent(cat.name)}`}
                className="card-interactive text-center py-8 group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">{cat.icon}</div>
                <div className="font-bold text-slate-800 mb-1">{cat.name}</div>
                <div className="text-sm text-slate-400">{cat.count} خدمة</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Trust & Safety ---- */}
      <section className="section bg-white">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-6">
                مجتمع آمن
                <br />
                <span className="gradient-text">وموثوق</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Shield, text: "نظام تقييم وسمعة شفاف لكل مستخدم" },
                  { icon: Star, text: "مراجعات حقيقية بعد كل تبادل مكتمل" },
                  { icon: Users, text: "فريق إشراف بشري على المحتوى" },
                  { icon: TrendingUp, text: "نظام نقاط لحفظ حقوق الجميع" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                    <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-sky-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="space-y-4">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`avatar-md ${t.color} text-white font-bold flex items-center justify-center text-lg`}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{t.name}</div>
                      <div className="text-sm text-slate-500">{t.role}</div>
                    </div>
                    <div className="mr-auto flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 star-filled" />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="py-24 bg-gradient-to-br from-sky-500 to-emerald-500 text-white">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            جاهز لتبادل مهاراتك؟
          </h2>
          <p className="text-sky-100 text-xl mb-10 max-w-xl mx-auto">
            انضم لأكثر من 8,000 عضو يتعاونون يومياً بدون أي رسوم أو وسيط مالي.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-3 bg-white text-sky-600 font-black text-lg px-10 py-4 rounded-2xl hover:bg-sky-50 transition-colors shadow-xl"
          >
            سجّل مجاناً الآن
            <ArrowLeft className="w-5 h-5 rtl-flip" />
          </Link>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 font-black text-white text-xl">
              <span className="w-8 h-8 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Repeat2 className="w-4 h-4 text-white" />
              </span>
              SwapHub
            </div>

            <div className="flex gap-6 text-sm">
              <Link href="/about" className="hover:text-white transition-colors">عن المنصة</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">الخصوصية</Link>
              <Link href="/terms" className="hover:text-white transition-colors">الشروط</Link>
              <Link href="/support" className="hover:text-white transition-colors">الدعم</Link>
            </div>

            <p className="text-sm text-slate-500">
              © 2024 SwapHub. مبني بـ ❤️ للمجتمع.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

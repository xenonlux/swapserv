# 🔄 SwapHub — منصة تبادل الخدمات المجتمعية

> منصة مجتمعية مفتوحة لتبادل الخدمات بدون مقابل مادي — خدمة مقابل خدمة أو نقاط داخلية.

---

## 📋 نظرة عامة

SwapHub تتيح للمستخدمين:
- **نشر خدماتهم** (برمجة، تصميم، تعليم، نجارة، طبخ... أي شيء)
- **طلب خدمات** يحتاجونها مع عرض خدمة مقابلة
- **التبادل المباشر** (Barter) أو عبر **نظام النقاط** الداخلي
- **التواصل الفوري** عبر دردشة مدمجة
- **بناء سمعة** عبر نظام تقييم شفاف

---

## 🏗️ الهيكل المعماري

```
swaphub/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── api/                  # REST API endpoints
│   │   │   ├── auth/             # تسجيل، تحقق، OAuth
│   │   │   ├── services/         # CRUD الخدمات
│   │   │   ├── requests/         # CRUD الطلبات
│   │   │   ├── exchanges/        # منطق التبادل الكاملة
│   │   │   ├── messages/         # الرسائل
│   │   │   ├── reviews/          # التقييمات
│   │   │   ├── users/            # الملفات الشخصية
│   │   │   ├── search/           # بحث متقدم
│   │   │   └── notifications/    # الإشعارات
│   │   ├── dashboard/            # لوحة تحكم المستخدم
│   │   ├── explore/              # استكشاف الخدمات
│   │   ├── profile/[username]/   # الملفات الشخصية
│   │   ├── admin/                # لوحة الإدارة
│   │   └── auth/                 # صفحات تسجيل الدخول
│   ├── components/
│   │   ├── ui/                   # مكونات UI قابلة لإعادة الاستخدام
│   │   ├── layout/               # الـ Layout (sidebar, header)
│   │   ├── services/             # مكونات الخدمات والتبادلات
│   │   ├── chat/                 # دردشة الوقت الفعلي
│   │   ├── profile/              # مكونات الملف الشخصي
│   │   └── shared/               # Providers، مكونات مشتركة
│   ├── lib/
│   │   ├── auth/                 # NextAuth config
│   │   ├── db/                   # Prisma client + helpers
│   │   ├── redis/                # Cache + Rate limiting + Sockets
│   │   ├── ai/                   # نظام المطابقة الذكي
│   │   ├── validations/          # Zod schemas
│   │   └── utils/                # API helpers, points system
│   ├── hooks/                    # React hooks مخصصة
│   ├── store/                    # Zustand stores
│   └── types/                    # TypeScript types
├── prisma/
│   ├── schema.prisma             # قاعدة البيانات الكاملة (20+ جدول)
│   └── seed.ts                   # البيانات الأولية
└── tests/                        # Unit, Integration, E2E
```

---

## 🚀 التشغيل السريع

### 1. المتطلبات
```bash
Node.js >= 18.x
PostgreSQL >= 15
Redis >= 7
```

### 2. التثبيت
```bash
git clone https://github.com/yourname/swaphub.git
cd swaphub
npm install
```

### 3. إعداد البيئة
```bash
cp .env.example .env.local
# عدّل القيم في .env.local
```

### 4. قاعدة البيانات
```bash
npm run db:generate    # توليد Prisma Client
npm run db:migrate     # تطبيق الـ migrations
npm run db:seed        # البيانات الأولية (فئات، مهارات، شارات، مشرف)
```

### 5. التشغيل
```bash
npm run dev            # وضع التطوير على http://localhost:3000
```

---

## 🗄️ نموذج قاعدة البيانات

### الجداول الرئيسية (20+ جدول)

| الجدول | الوصف |
|--------|-------|
| `users` | المستخدمون + نظام النقاط + السمعة |
| `services` | الخدمات المعروضة |
| `service_requests` | الطلبات المنشورة |
| `exchanges` | التبادلات (Barter + Points + Hybrid) |
| `milestones` | مراحل تسليم التبادل |
| `messages` | الدردشة الفورية |
| `conversations` | المحادثات |
| `reviews` | التقييمات متعددة الأبعاد |
| `points_transactions` | سجل جميع معاملات النقاط |
| `notifications` | الإشعارات |
| `categories` | الفئات الهرمية |
| `skills` | المهارات |
| `user_skills` | مهارات المستخدمين مع المستوى |
| `badges` | الشارات |
| `follows` | متابعة المستخدمين |
| `reports` | الإبلاغ عن المخالفات |
| `audit_logs` | سجل التدقيق الأمني |
| `login_history` | سجل تسجيل الدخول |

---

## ✨ الميزات الرئيسية

### 🔄 نظام التبادل
- **Barter**: خدمة مباشرة مقابل خدمة
- **Points**: نقاط داخلية مقابل خدمة
- **Hybrid**: نقاط + خدمة مقابلة
- مراحل تسليم (Milestones)
- تأكيد ثنائي للاكتمال
- نظام نزاعات مع تدخل بشري

### 💬 الدردشة الفورية
- Socket.io للوقت الفعلي
- مؤشر الكتابة
- تأكيد القراءة (✓✓)
- دعم المرفقات
- رسائل النظام التلقائية

### ⭐ نظام النقاط
- 50 نقطة ترحيبية عند التسجيل
- 100 نقطة عند إتمام كل تبادل
- نقاط مقفلة (Reserved) أثناء التبادلات
- سجل كامل للمعاملات
- شارات ومكافآت

### 🤖 المطابقة الذكية
- تحليل احتياجات المستخدم من طلباته
- إيجاد الخدمات المناسبة لمهاراته
- حساب نسبة التوافق بين مستخدمَين
- تحديث التوصيات كل 15 دقيقة

### 🔒 الأمان
- Rate limiting بـ Redis على جميع الـ endpoints
- JWT + NextAuth + Prisma Adapter
- OAuth (Google + GitHub)
- Zod validation لكل المدخلات
- Audit logging
- سجل تسجيل الدخول

---

## 🌐 API Endpoints

### Auth
```
POST /api/auth/register        # تسجيل مستخدم جديد
POST /api/auth/[...nextauth]   # NextAuth endpoints
```

### Services
```
GET    /api/services           # قائمة/بحث الخدمات
POST   /api/services           # إنشاء خدمة
GET    /api/services/[id]      # تفاصيل خدمة
PUT    /api/services/[id]      # تحديث خدمة
DELETE /api/services/[id]      # حذف خدمة
```

### Exchanges
```
GET    /api/exchanges          # تبادلاتي
POST   /api/exchanges          # إنشاء تبادل
GET    /api/exchanges/[id]     # تفاصيل تبادل
PATCH  /api/exchanges/[id]/status  # تغيير الحالة
POST   /api/exchanges/[id]/confirm # تأكيد الاكتمال
POST   /api/exchanges/[id]/dispute # فتح نزاع
GET    /api/exchanges/[id]/messages # رسائل التبادل
```

### Users
```
GET    /api/users/[username]   # الملف الشخصي
PATCH  /api/users/[username]   # تحديث الملف
POST   /api/users/[username]/follow # متابعة
```

### Search
```
GET /api/search?q=...&type=services|requests|users
```

---

## 📊 الأداء والتوسع

| الطبقة | الحل |
|--------|------|
| Cache | Redis (TTL متغير حسب النوع) |
| DB Queries | Prisma + Connection Pooling |
| Real-time | Socket.io (قابل للتوسع بـ Redis Adapter) |
| Images | UploadThing (CDN مدمج) |
| Queues | BullMQ للمهام الثقيلة |
| Rate Limiting | Redis + rate-limiter-flexible |

---

## 🧪 الاختبارات

```bash
npm test              # Unit tests (Jest)
npm run test:e2e      # E2E tests (Playwright)
npm run test:coverage # تقرير التغطية
```

---

## 👤 بيانات المشرف الافتراضي
```
البريد: admin@swaphub.com
كلمة المرور: Admin@123456
```

> ⚠️ غيّر كلمة المرور فوراً في بيئة الإنتاج!

---

## 📄 الترخيص

MIT License — مفتوح المصدر وحر الاستخدام للمجتمع.
# swapserv
# swapserv

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding SwapHub database...")

  // ---- Categories ----
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: "tech" }, update: {}, create: { name: "Technology", nameAr: "تقنية وبرمجة", slug: "tech", icon: "💻", color: "#0EA5E9" } }),
    prisma.category.upsert({ where: { slug: "design" }, update: {}, create: { name: "Design", nameAr: "تصميم وإبداع", slug: "design", icon: "🎨", color: "#8B5CF6" } }),
    prisma.category.upsert({ where: { slug: "education" }, update: {}, create: { name: "Education", nameAr: "تعليم وتدريب", slug: "education", icon: "📚", color: "#10B981" } }),
    prisma.category.upsert({ where: { slug: "home" }, update: {}, create: { name: "Home Services", nameAr: "خدمات منزلية", slug: "home", icon: "🏠", color: "#F59E0B" } }),
    prisma.category.upsert({ where: { slug: "health" }, update: {}, create: { name: "Health & Fitness", nameAr: "صحة ورياضة", slug: "health", icon: "🏋️", color: "#EF4444" } }),
    prisma.category.upsert({ where: { slug: "business" }, update: {}, create: { name: "Business", nameAr: "أعمال وتسويق", slug: "business", icon: "📈", color: "#0F172A" } }),
    prisma.category.upsert({ where: { slug: "arts" }, update: {}, create: { name: "Arts & Music", nameAr: "فنون وموسيقى", slug: "arts", icon: "🎵", color: "#EC4899" } }),
    prisma.category.upsert({ where: { slug: "languages" }, update: {}, create: { name: "Languages", nameAr: "لغات وترجمة", slug: "languages", icon: "🌍", color: "#06B6D4" } }),
  ])

  console.log(`✅ Created ${categories.length} categories`)

  // ---- Skills ----
  const skillsData = [
    // Tech
    { name: "Web Development", nameAr: "تطوير ويب", slug: "web-dev", categorySlug: "tech" },
    { name: "Mobile Development", nameAr: "تطوير تطبيقات", slug: "mobile-dev", categorySlug: "tech" },
    { name: "Python", nameAr: "بايثون", slug: "python", categorySlug: "tech" },
    { name: "Data Analysis", nameAr: "تحليل البيانات", slug: "data-analysis", categorySlug: "tech" },
    { name: "Cybersecurity", nameAr: "أمن معلومات", slug: "cybersecurity", categorySlug: "tech" },
    // Design
    { name: "UI/UX Design", nameAr: "تصميم واجهات", slug: "ui-ux", categorySlug: "design" },
    { name: "Graphic Design", nameAr: "تصميم جرافيك", slug: "graphic-design", categorySlug: "design" },
    { name: "Logo Design", nameAr: "تصميم شعارات", slug: "logo-design", categorySlug: "design" },
    { name: "Video Editing", nameAr: "مونتاج فيديو", slug: "video-editing", categorySlug: "design" },
    // Education
    { name: "Math Tutoring", nameAr: "تدريس رياضيات", slug: "math", categorySlug: "education" },
    { name: "Science Tutoring", nameAr: "تدريس علوم", slug: "science", categorySlug: "education" },
    { name: "Quran Teaching", nameAr: "تحفيظ القرآن", slug: "quran", categorySlug: "education" },
    // Languages
    { name: "English", nameAr: "اللغة الإنجليزية", slug: "english", categorySlug: "languages" },
    { name: "Arabic", nameAr: "اللغة العربية", slug: "arabic", categorySlug: "languages" },
    { name: "Translation", nameAr: "ترجمة", slug: "translation", categorySlug: "languages" },
    // Business
    { name: "Accounting", nameAr: "محاسبة", slug: "accounting", categorySlug: "business" },
    { name: "Marketing", nameAr: "تسويق", slug: "marketing", categorySlug: "business" },
    { name: "Social Media", nameAr: "تواصل اجتماعي", slug: "social-media", categorySlug: "business" },
    // Home
    { name: "Plumbing", nameAr: "سباكة", slug: "plumbing", categorySlug: "home" },
    { name: "Carpentry", nameAr: "نجارة", slug: "carpentry", categorySlug: "home" },
    { name: "Cooking", nameAr: "طبخ", slug: "cooking", categorySlug: "home" },
  ]

  const categoryMap = Object.fromEntries(categories.map(c => [c.slug, c.id]))

  for (const skill of skillsData) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: {},
      create: {
        name: skill.name,
        nameAr: skill.nameAr,
        slug: skill.slug,
        categoryId: categoryMap[skill.categorySlug],
      },
    })
  }

  console.log(`✅ Created ${skillsData.length} skills`)

  // ---- Badges ----
  const badges = [
    { name: "first_exchange", nameAr: "أول تبادل", description: "أكمل أول تبادل", icon: "🌟", color: "#F59E0B", points: 25 },
    { name: "ten_exchanges", nameAr: "عشر تبادلات", description: "أكمل 10 تبادلات", icon: "🏆", color: "#EF4444", points: 100 },
    { name: "top_rated", nameAr: "الأعلى تقييماً", description: "احصل على تقييم 5 نجوم 5 مرات", icon: "⭐", color: "#0EA5E9", points: 50 },
    { name: "helper", nameAr: "مساعد المجتمع", description: "قدم 5 خدمات مجانية", icon: "🤝", color: "#10B981", points: 75 },
    { name: "verified", nameAr: "عضو موثّق", description: "تحقق من هويتك", icon: "✅", color: "#8B5CF6", points: 30 },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { id: badge.name },
      update: {},
      create: { ...badge, criteria: {} },
    }).catch(() => prisma.badge.create({ data: { ...badge, criteria: {} } }).catch(() => null))
  }

  console.log(`✅ Created ${badges.length} badges`)

  // ---- System Settings ----
  await prisma.systemSetting.upsert({
    where: { key: "platform_config" },
    update: {},
    create: {
      key: "platform_config",
      value: {
        maxServicesPerUser: 50,
        maxActiveExchanges: 10,
        welcomePoints: 50,
        pointsPerExchange: 100,
        maintenanceMode: false,
        registrationOpen: true,
      },
      description: "Platform configuration settings",
    },
  })

  // ---- Demo Admin User ----
  const adminExists = await prisma.user.findUnique({ where: { email: "admin@swaphub.com" } })
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: "admin@swaphub.com",
        username: "admin",
        displayName: "مشرف SwapHub",
        password: await bcrypt.hash("Admin@123456", 12),
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        isEmailVerified: true,
        availablePoints: 1000,
        totalPoints: 1000,
      },
    })
    console.log("✅ Created admin user: admin@swaphub.com / Admin@123456")
  }

  console.log("✅ Seeding complete!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

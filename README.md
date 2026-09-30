# منصة درس — DRD Video Learning Platform

منصة تعليمية بالفيديو متكاملة مبنية وفق مستند متطلبات DRD: كورسات مقسمة لدروس مرتبة، مشغّل فيديو ذكي يحفظ تقدمك تلقائيًا، لوحة تحكم كاملة للإدارة لرفع الكورسات وإدارة المستخدمين والصلاحيات، وجهوزية كاملة للربط مع Supabase.

![Tech](https://img.shields.io/badge/Next.js%2016-React%2019-000?logo=next.js) ![TS](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

## ✨ المميزات

### للمتعلم
- 🎬 **مشغّل فيديو ذكي** — حفظ تلقائي للموضع كل 15 ثانية، واستكمال من حيث توقفت حتى بعد إغلاق المتصفح
- 📊 **لوحة «لوحتي»** — حلقة تقدم متحركة، عدادات إحصائية، رسم بياني للنشاط الأسبوعي (دقائق المشاهدة + الدروس المكتملة)، وشارات إنجاز
- 📚 **كورسات ودروس منظمة** — صفحة لكل درس تجمع الفيديو والوصف والموارد والروابط
- 🔒 **قاعدة اكتمال 90%** — لا يُحتسب الدرس مكتملًا إلا بعد مشاهدة 90% منه، والتقدم لا يتراجع أبدًا
- 🌗 **وضع داكن/فاتح** + تصميم متجاوب كامل (موبايل/تابلت/ديسكتوب) + دعم RTL أصيل

### للإدارة (`#/admin`)
- 📁 **رفع الكورسات والدروس** — إدارة كاملة (إضافة/تعديل/حذف/نشر/أرشفة) مع دعم Google Drive أو روابط فيديو مباشرة
- 👥 **المستخدمون والصلاحيات** — بحث وتصفية، ترقية/تخفيض الأدوار (ADMIN/STUDENT)، تفعيل/تعطيل الحسابات، ومرجع صلاحيات واضح
- 🗄️ **قسم قاعدة البيانات** — فحص حالة ربط Supabase مباشرة من اللوحة + عرض ملفات SQL وخطوات الربط
- 🩺 **Workflow فحص الصحة** — فحص شامل لسلامة البيانات والروابط مع سجل تشغيلات
- 📈 إحصائيات المنصة وسجل أنشطة كامل

### الأنميشن والتفاعل
- انتقالات سلسة بين الصفحات (AnimatePresence + blur/fade)
- ظهور متتابع للبطاقات (Stagger) وتأثيرات Hover ثلاثية الأبعاد
- عدادات رقمية متحركة وحلقة تقدم SVG متحركة
- خلفيات متحركة (Floating Blobs) في الواجهة الرئيسية ولوحة الطالب

## 🚀 التشغيل المحلي

```bash
# 1) تثبيت الحزم
bun install   # أو npm install

# 2) تهيئة قاعدة البيانات (SQLite محليًا)
cp .env.example .env   # عدّل المتغيرات إن لزم
bun run db:push
bun prisma/seed.ts     # بيانات تجريبية

# 3) التشغيل
bun run dev            # http://localhost:3000
```

### حسابات تجريبية

| الدور | البريد | كلمة المرور |
|---|---|---|
| مدير | `admin@drd.edu` | `Admin@123` |
| طالب | `student@drd.edu` | `Student@123` |
| طالبة | `sara@drd.edu` | `Student@123` |

## 🗄️ الربط مع Supabase

المشروع جاهز للانتقال إلى Supabase (PostgreSQL) بدون أي تعديل على الكود:

1. شغّل `supabase/schema.sql` في SQL Editor بـ Supabase (ينشئ 8 جداول + الفهارس + Triggers)
2. شغّل `supabase/seed.sql` (بيانات تجريبية كاملة + حسابات مشفرة بنفس خوارزمية scrypt)
3. أضف متغيرات البيئة (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, …) — انظر `.env.example`
4. تحقق من الربط من داخل المنصة: **لوحة الإدارة → قاعدة البيانات**
5. (اختياري) حوّل Prisma إلى PostgreSQL بتغيير `provider` في `prisma/schema.prisma`

الدليل الكامل خطوة بخطوة: [`supabase/README.md`](supabase/README.md)

## 🏗️ البنية التقنية

| الطبقة | التقنية |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| الواجهة | Tailwind CSS 4 + shadcn/ui + framer-motion + Recharts |
| الحالة | Zustand (عميل) + TanStack Query (سيرفر) |
| قاعدة البيانات | Prisma ORM (SQLite → PostgreSQL/Supabase جاهز) |
| المصادقة | scrypt + جلسات HMAC-SHA256 في httpOnly cookies |
| الصلاحيات | ADMIN / STUDENT محمية على السيرفر (FR-13) |

### خريطة الملفات
```
src/
├── app/api/            # 14 مسار API (auth, courses, lessons, progress, dashboard, admin, supabase)
├── components/
│   ├── motion/         # مكتبة الأنميشن الموحدة (FadeIn, Stagger, ProgressRing, ...)
│   ├── views/          # صفحات التطبيق (home, courses, lesson, dashboard, admin/**)
│   └── ui/             # مكونات shadcn/ui
├── lib/                # auth, client, router (Hash SPA), supabase, workflow
prisma/                 # schema.prisma + seed.ts
supabase/               # schema.sql + seed.sql + دليل الربط
```

## 📄 الوثائق المرجعية

- `upload/DRD_Video_Learning_Platform.docx` — مستند المتطلبات الأصلي (FR-01 → FR-14)
- المتطلبات الوظيفية مغطاة بالكامل وتوثّق داخل الكود بأرقام الأقسام

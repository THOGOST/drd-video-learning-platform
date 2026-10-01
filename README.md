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
3. أضف متغيرات البيئة (`DATABASE_URL`, `SESSION_SECRET`, …) — انظر `.env.example`
4. تحقق من الربط من داخل المنصة: **لوحة الإدارة → قاعدة البيانات**
5. توليد Prisma Client لـ PostgreSQL يتم **تلقائيًا** على Vercel عبر `scripts/prisma-generate.js` (مخطط `prisma/schema.postgres.prisma` المطابق حرفيًا لـ `supabase/schema.sql`)

الدليل الكامل خطوة بخطوة: [`supabase/README.md`](supabase/README.md)

## ▲ النشر على Vercel

المشروع مهيأ مسبقًا لـ Vercel (مخطط PostgreSQL تلقائي + فهرسة بيانات بيئة الإنتاج):

### الخطوات

1. **Supabase**: شغّل `supabase/schema.sql` ثم `supabase/seed.sql` في SQL Editor
2. **Supabase**: انسخ Connection String (منفذ **6543** Transaction Pooler) من Project Settings → Database
3. **Vercel**: أضف متغيرات البيئة التالية في Settings → Environment Variables (للبيئات الثلاث):

   | المتغير | القيمة |
   |---|---|
   | `DATABASE_URL` | `postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
   | `SESSION_SECRET` | سلسلة عشوائية طويلة (`openssl rand -base64 32`) |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://PROJECT_REF.supabase.co` (اختياري) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح anon (اختياري) |
   | `NEXT_PUBLIC_GOOGLE_API_KEY` | مفتاح Google Drive API (اختياري — موصى به: يتيح وضع «جودة أصلية» لتشغيل دروس Drive بجودتها الكاملة حتى في ملء الشاشة) |

   > للحصول على المفتاح: [Google Cloud Console](https://console.cloud.google.com) → أنشئ مشروعًا → **APIs & Services → Library** → فعّل **Google Drive API** → **Credentials → Create Credentials → API Key** → قيّده (API restrictions: Google Drive API + Website restrictions: نطاق موقعك). الملفات يجب أن تكون مشاركة بـ«أي شخص لديه الرابط».

4. **Vercel**: Redeploy — البناء يولّد Prisma Client لـ PostgreSQL تلقائيًا
5. **تحقق**: افتح الموقع ← سجل الدخول بالحسابات التجريبية ← لوحة الإدارة → قاعدة البيانات

### كيف يعمل النشر تلقائيًا؟

```
Git Push → GitHub → Vercel (Auto Deploy)
  ├─ postinstall / build → scripts/prisma-generate.js
  │    └─ متغير VERCEL موجود؟ → توليد Prisma Client من schema.postgres.prisma
  │    └─ محليًا؟            → توليد Prisma Client من schema.sqlite.prisma
  └─ next build → نشر الموقع
```

### استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| `Environment variable not found: DATABASE_URL` | أضف المتغير في Vercel ثم Redeploy |
| `the URL must start with the protocol postgresql://` | DATABASE_URL لا يزال بصيغة `file:` — ضع رابط Supabase Pooler |
| `Can't reach database server` | استخدم منفذ 6543 (Pooler) وليس 5432، وتأكد من كلمة المرور |
| تسجيل الدخول يفشل بعد النشر | شغّل `supabase/seed.sql` لإنشاء الحسابات التجريبية |

## 🏗️ البنية التقنية

| الطبقة | التقنية |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| الواجهة | Tailwind CSS 4 + shadcn/ui + framer-motion + Recharts |
| الحالة | Zustand (عميل) + TanStack Query (سيرفر) |
| قاعدة البيانات | Prisma ORM (SQLite محليًا → PostgreSQL/Supabase تلقائيًا على Vercel) |
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
prisma/                 # schema.sqlite.prisma (محلي) + schema.postgres.prisma (Vercel) + seed.ts
supabase/               # schema.sql + seed.sql + دليل الربط
scripts/prisma-generate.js  # توليد العميل حسب البيئة تلقائيًا
```

## 📄 الوثائق المرجعية

- `upload/DRD_Video_Learning_Platform.docx` — مستند المتطلبات الأصلي (FR-01 → FR-14)
- المتطلبات الوظيفية مغطاة بالكامل وتوثّق داخل الكود بأرقام الأقسام

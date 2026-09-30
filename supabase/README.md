# ربط المنصة بـ Supabase — دليل كامل خطوة بخطوة

هذا الدليل ينقلك من قاعدة البيانات المحلية (SQLite) إلى Supabase (PostgreSQL سحابي) بأقل مجهود. المشروع مصمم مسبقًا لهذا الانتقال: كل الموديلات متوافقة، وملفات SQL جاهزة للتشغيل المباشر.

## المحتويات
- [ماذا يوجد في مجلد supabase؟](#الملفات)
- [الخطوة 1: إنشاء مشروع Supabase](#الخطوة-1)
- [الخطوة 2: تشغيل schema.sql](#الخطوة-2)
- [الخطوة 3: تشغيل seed.sql](#الخطوة-3)
- [الخطوة 4: ضبط متغيرات البيئة](#الخطوة-4)
- [الخطوة 5: التحقق من الربط من لوحة الإدارة](#الخطوة-5)
- [الخطوة 6 (اختياري): تحويل Prisma إلى PostgreSQL](#الخطوة-6-اختياري)
- [ملاحظات أمنية](#ملاحظات-أمنية)

<a id="الملفات"></a>
## ماذا يوجد في مجلد supabase؟

| الملف | الوظيفة |
|---|---|
| `schema.sql` | إنشاء كل الجداول الثمانية (users, courses, lessons, lesson_links, progress, course_enrollments, activity_logs, workflow_runs) مع الفهارس والقيود وTriggers لتحديث `updated_at` |
| `seed.sql` | بيانات تجريبية كاملة: 3 مستخدمين + 4 كورسات + 14 درسًا + 12 رابطًا + تقدم تجريبي + سجل نشاط |
| `README.md` | هذا الدليل |

<a id="الخطوة-1"></a>
## الخطوة 1: إنشاء مشروع Supabase

1. ادخل إلى [supabase.com/dashboard](https://supabase.com/dashboard) وأنشئ حسابًا مجانيًا.
2. اضغط **New project** واختر اسمًا مثل `drd-learning`.
3. اختر كلمة مرور لقاعدة البيانات واحفظها في مكان آمن، واختر المنطقة الأقرب لجمهورك.
4. انتظر دقيقة–دقيقتين حتى تجهز المشروع.

<a id="الخطوة-2"></a>
## الخطوة 2: تشغيل schema.sql

1. من القائمة الجانبية في لوحة Supabase افتح **SQL Editor**.
2. اضغط **New query**.
3. انسخ محتوى الملف `supabase/schema.sql` كاملًا والصقه ثم اضغط **Run**.
4. ستظهر رسالة نجاح — تحقق من تبويب **Table Editor** وستجد الجداول الثمانية ظهرت.

<a id="الخطوة-3"></a>
## الخطوة 3: تشغيل seed.sql

1. في نفس **SQL Editor** اضغط **New query** جديدة.
2. انسخ محتوى `supabase/seed.sql` والصقه ثم **Run**.
3. للتحقق، شغّل في نافذة استعلام:
   ```sql
   SELECT COUNT(*) FROM users;   -- 3
   SELECT COUNT(*) FROM courses; -- 4
   SELECT COUNT(*) FROM lessons; -- 14
   ```

الحسابات الجاهزة للدخول بعد التهيئة:

| الدور | البريد | كلمة المرور |
|---|---|---|
| مدير | `admin@drd.edu` | `Admin@123` |
| طالب | `student@drd.edu` | `Student@123` |
| طالبة | `sara@drd.edu` | `Student@123` |

كلمات المرور مشفرة بنفس خوارزمية التطبيق (scrypt بصيغة `salt:hash`) لذا تسجيل الدخول سيعمل فورًا دون أي خطوة إضافية.

<a id="الخطوة-4"></a>
## الخطوة 4: ضبط متغيرات البيئة

من لوحة Supabase: **Project Settings → API** انسخ القيم، ثم عدّل ملف `.env` في جذر المشروع:

```env
# Supabase (العميل والواجهة)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key

# Supabase (خلفي — اختياري للعمليات الإدارية)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...your-service-role-key

# رابط قاعدة البيانات (من Project Settings → Database → Connection string → URI)
# استخدم "Connection pooling" للنشر على منصات سحابية
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

> ملحوظة: `NEXT_PUBLIC_SUPABASE_ANON_KEY` مفتاح عام آمن للواجهة، أما `SERVICE_ROLE` فلا تضعه أبدًا في كود المتصفح.

<a id="الخطوة-5"></a>
## الخطوة 5: التحقق من الربط من لوحة الإدارة

1. شغّل التطبيق وسجّل الدخول كحساب مدير.
2. افتح **لوحة تحكم الإدارة → قاعدة البيانات**.
3. ستجد بطاقة حالة تُظهر: هل متغيرات البيئة مضبوطة، ونتيجة اختبار اتصال فعلي بـ Supabase REST، ومكان ملفات SQL — كلها من مسار `/api/supabase/status`.

<a id="الخطوة-6-اختياري"></a>
## الخطوة 6 (اختياري): تحويل Prisma إلى PostgreSQL

هذه الخطوة تجعل التطبيق كله (المصادقة، الكورسات، التقدم) يعمل فوق Supabase مباشرة:

1. عدّل `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"   // كان "sqlite"
     url      = env("SUPABASE_DB_URL")
   }
   ```
2. ثم:
   ```bash
   bun run db:generate   # إعادة توليد عميل Prisma
   bun run db:push       # مزامنة المخطط (جداول Supabase جاهزة أصلًا من schema.sql)
   ```
3. أعد تشغيل التطبيق — كل الوظائف تعمل الآن فوق Supabase.

> **بدون الخطوة 6**: يبقى التطبيق يعمل بـ SQLite محليًا، ويبقى عميل `src/lib/supabase.ts` جاهزًا للاستخدام التدريجي (قراءة الكورسات من Supabase مثلًا) — الربط «مجهز» ولا يكسر شيئًا.

<a id="ملاحظات-أمنية"></a>
## ملاحظات أمنية

- **RLS (Row Level Security)**: التطبيق يصل لقاعدة البيانات عبر السيرفر فقط، لذا `schema.sql` لا يفعّل RLS. إن استخدمت `supabase-js` من المتصفح مباشرة، فعّل RLS وأضف السياسات المذكورة في نهاية `schema.sql`.
- **مفاتيح API**: أي مفتاح ظهر في لوحة الإدارة يظهر **مقصوصًا** (`…xxxx`) فقط للعرض، ولا يُعاد كاملًا للعميل.
- **كلمات المرور**: scrypt بملح عشوائي لكل مستخدم، والتحقق عبر `timingSafeEqual`.

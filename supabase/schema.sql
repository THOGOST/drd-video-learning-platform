-- ═══════════════════════════════════════════════════════════════
-- DRD Video Learning Platform — Supabase / PostgreSQL Schema
-- شغّل هذا الملف في: Supabase Dashboard → SQL Editor → New query → Run
-- المطابق تمامًا لمخطط prisma/schema.prisma
-- ═══════════════════════════════════════════════════════════════

-- تنظيف آمن (بالترتيب العكسي للعلاقات) — مفيد عند إعادة التشغيل
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS workflow_runs CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS course_enrollments CASCADE;
DROP TABLE IF EXISTS lesson_links CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ─── users: بيانات المستخدمين والصلاحيات ───
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                -- صيغة scrypt: salt:hash (متوافقة مع src/lib/auth.ts)
  role          TEXT NOT NULL DEFAULT 'STUDENT',   -- ADMIN | STUDENT
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── courses: الكورسات ───
CREATE TABLE courses (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  thumbnail   TEXT,
  status      TEXT NOT NULL DEFAULT 'PUBLISHED', -- DRAFT | PUBLISHED | ARCHIVED
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── lessons: الدروس والفيديوهات ───
CREATE TABLE lessons (
  id           TEXT PRIMARY KEY,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  order_index  INTEGER NOT NULL DEFAULT 0,
  duration     INTEGER NOT NULL DEFAULT 0,       -- بالثواني
  drive_file_id TEXT,                            -- Google Drive File ID (FR-12)
  video_url    TEXT,                             -- رابط فيديو مباشر (بديل/إضافة لـ Drive)
  video_source TEXT NOT NULL DEFAULT 'direct',   -- direct | drive
  status       TEXT NOT NULL DEFAULT 'PUBLISHED',-- DRAFT | PUBLISHED
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX lessons_course_order_idx ON lessons (course_id, order_index);

-- ─── lesson_links: الروابط والموارد الإضافية ───
CREATE TABLE lesson_links (
  id         TEXT PRIMARY KEY,
  lesson_id  TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  url        TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'link',       -- link | file | github | doc
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX lesson_links_lesson_idx ON lesson_links (lesson_id);

-- ─── progress: تقدم المستخدم (نظام حفظ التقدم — القسم 11) ───
CREATE TABLE progress (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id        TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  last_position    INTEGER NOT NULL DEFAULT 0,   -- آخر ثانية مشاهدة
  progress_percent INTEGER NOT NULL DEFAULT 0,   -- 0 → 100
  completed        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX progress_user_lesson_uniq ON progress (user_id, lesson_id);

-- ─── course_enrollments: ربط المستخدم بالكورس ───
CREATE TABLE course_enrollments (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX enrollment_user_course_uniq ON course_enrollments (user_id, course_id);

-- ─── activity_logs: سجل الأنشطة والأخطاء (القسم 6: Logging) ───
CREATE TABLE activity_logs (
  id         TEXT PRIMARY KEY,
  actor_id   TEXT,
  actor_name TEXT,
  action     TEXT NOT NULL,    -- LOGIN | REGISTER | COURSE_CREATE | LESSON_COMPLETE | WORKFLOW_RUN ...
  entity     TEXT,             -- course | lesson | link | user | workflow
  entity_id  TEXT,
  detail     TEXT,
  level      TEXT NOT NULL DEFAULT 'INFO',  -- INFO | WARN | ERROR
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_logs_created_idx ON activity_logs (created_at);

-- ─── workflow_runs: سجل تشغيلات الـ Workflow (القسم 12) ───
CREATE TABLE workflow_runs (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'SUCCESS',  -- SUCCESS | WARNING | FAILED
  result     TEXT,                             -- JSON
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Trigger: تحديث updated_at تلقائيًا ───
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_courses_updated  BEFORE UPDATE ON courses  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lessons_updated  BEFORE UPDATE ON lessons  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ملاحظات أمنية ───
-- 1) التطبيق يتعامل مع قاعدة البيانات عبر السيرفر (Prisma) بحساب service_role،
--    لذلك لا نفعّل RLS افتراضيًا. إن أردت الوصول المباشر من المتصفح عبر
--    supabase-js بمفتاح anon، فعّل RLS وأضف سياسات مثل:
--
--    ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
--    CREATE POLICY "public read published courses" ON courses
--      FOR SELECT USING (status = 'PUBLISHED');
--    CREATE POLICY "users read own progress" ON progress
--      FOR SELECT USING (auth.uid()::text = user_id);

-- ─── v1.1: اختبارات الدروس (اختيار من متعدد) ───
CREATE TABLE IF NOT EXISTS quiz_questions (
  id             TEXT PRIMARY KEY,
  lesson_id      TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question       TEXT NOT NULL,
  options        TEXT NOT NULL,              -- JSON array من نصوص الخيارات
  correct_index  INTEGER NOT NULL DEFAULT 0,
  order_index    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quiz_questions_lesson_idx ON quiz_questions(lesson_id);

CREATE TABLE IF NOT EXISTS quiz_passes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL DEFAULT 0,
  total      INTEGER NOT NULL DEFAULT 0,
  passed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS quiz_pass_user_lesson_uniq ON quiz_passes(user_id, lesson_id);

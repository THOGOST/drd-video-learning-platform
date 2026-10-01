// ترقية قاعدة الإنتاج Supabase: إنشاء جدولي الاختبارات (quiz_questions + quiz_passes)
// الاستخدام: node scripts/dbtest/migrate-quiz.mjs "<DATABASE_URL>"
import pg from "pg";

const url = process.argv[2];
if (!url) {
  console.error("الاستخدام: node migrate-quiz.mjs \"postgresql://...\"");
  process.exit(1);
}

const SQL = `
CREATE TABLE IF NOT EXISTS quiz_questions (
  id             TEXT PRIMARY KEY,
  lesson_id      TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question       TEXT NOT NULL,
  options        TEXT NOT NULL,
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
`;

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query(SQL);
  console.log("✔ تم إنشاء جدولي الاختبارات بنجاح");
  const { rows } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'quiz%' ORDER BY 1"
  );
  console.log("الجداول:", rows.map((r) => r.table_name).join(", "));
} catch (e) {
  console.error("✘ فشل التنفيذ:", e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

// تشخيص: ليه تقدم الطالب البصري qa_auto_04 وصل 100%؟
// الاستخدام: node scripts/dbtest/diag-progress.mjs "<DATABASE_URL>"
import pg from "pg";

const url = process.argv[2];
if (!url) { console.error("الاستخدام: node diag-progress.mjs \"postgresql://...\""); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const u = await client.query(
  "SELECT id, name, email FROM users WHERE email LIKE 'qa_auto_%' ORDER BY created_at"
);
console.log("== مستخدمو الاختبار ==");
for (const r of u.rows) console.log(r.id, "|", r.email, "|", r.name);

const ids = u.rows.map(r => r.id);
const p = await client.query(
  "SELECT user_id, lesson_id, last_position, progress_percent, completed, created_at, updated_at FROM progress WHERE user_id = ANY($1) ORDER BY updated_at",
  [ids]
);
console.log("\n== صفوف التقدم ==");
for (const r of p.rows) console.log(r);

const a = await client.query(
  "SELECT actor_id, action, entity_id, detail, created_at FROM activity_logs WHERE actor_id = ANY($1) ORDER BY created_at",
  [ids]
);
console.log("\n== سجل الأنشطة ==");
for (const r of a.rows) console.log(r.action, "|", r.detail, "|", r.created_at);

const qp = await client.query(
  "SELECT user_id, lesson_id, score, total, passed_at FROM quiz_passes WHERE user_id = ANY($1)",
  [ids]
);
console.log("\n== اجتيازات الاختبار ==");
for (const r of qp.rows) console.log(r);

await client.end();

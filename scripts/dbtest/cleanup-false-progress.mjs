// تنظيف الإكمال الزائف للطالب التجريبي qa_auto_04 (سبّبه باج مؤقت Drive قبل الإصلاح)
// الاستخدام: node scripts/dbtest/cleanup-false-progress.mjs "<DATABASE_URL>"
import pg from "pg";

const url = process.argv[2];
if (!url) { console.error("الاستخدام: node cleanup-false-progress.mjs \"postgresql://...\""); process.exit(1); }

const UID = "cmuppufxp000njm048kj9w6zt"; // qa_auto_04@drd.edu — طالب معاينة بصرية
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const del = await client.query(
  "DELETE FROM progress WHERE user_id=$1 RETURNING lesson_id, progress_percent, completed", [UID]);
console.log("صفوف تقدم محذوفة:", JSON.stringify(del.rows));

const dl = await client.query(
  "DELETE FROM activity_logs WHERE actor_id=$1 AND action IN ('LESSON_COMPLETE') RETURNING id", [UID]);
console.log("سجلات LESSON_COMPLETE محذوفة:", dl.rowCount);

const rest = await client.query(
  "SELECT lesson_id, progress_percent, completed FROM progress WHERE user_id=$1", [UID]);
console.log("المتبقي لهذا الطالب:", JSON.stringify(rest.rows));

await client.end();
console.log("تم التنظيف ✔");

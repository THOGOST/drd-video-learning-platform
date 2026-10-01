// اختبار اتصال قاعدة بيانات Supabase (Transaction Pooler 6543)
// الاستخدام: node test-connection.mjs "postgresql://postgres.REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
import pg from "pg";

const url = process.argv[2];
if (!url) {
  console.error("❌ ضع رابط الاتصال كوسيطة أولى");
  process.exit(1);
}

const masked = url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
console.log(`🔍 اختبار: ${masked}`);

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 12000,
});

try {
  await client.connect();
  const { rows } = await client.query("SELECT current_database() AS db, version() AS v");
  console.log(`✅ الاتصال نجح! قاعدة البيانات: ${rows[0].db}`);
  console.log(`   ${rows[0].v.split(",")[0]}`);

  // فحص الجداول والبيانات
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' ORDER BY table_name`);
  console.log(`📊 الجداول (${tables.rows.length}): ${tables.rows.map(r=>r.table_name).join(", ")}`);

  const users = await client.query("SELECT email, role, is_active FROM users ORDER BY created_at LIMIT 5");
  console.log(`👥 المستخدمون: ${users.rows.map(u=>`${u.email}(${u.role}${u.is_active?"":" ⛔معطل"})`).join(", ")}`);

  const courses = await client.query("SELECT count(*)::int AS n FROM courses");
  const lessons = await client.query("SELECT count(*)::int AS n FROM lessons");
  console.log(`📚 الكورسات: ${courses.rows[0].n} | الدروس: ${lessons.rows[0].n}`);
  console.log("\n🎉 قاعدة البيانات جاهزة تماماً للنشر على Vercel!");
} catch (e) {
  console.error(`❌ فشل الاتصال: ${e.message}`);
  if (e.message.includes("password authentication failed"))
    console.error("   → كلمة المرور خاطئة. جرّب Reset database password من الإعدادات");
  if (e.message.includes("tenant or user not found"))
    console.error("   → اسم المستخدم غير صحيح (لازم postgres.rerzipczdcgmbzyllcdu)");
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}

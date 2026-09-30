// DRD — Prisma Client Generator حسب البيئة
// ─────────────────────────────────────────────
// - على Vercel (يوجد متغير VERCEL): يولّد العميل من schema.postgres.prisma (Supabase)
// - محليًا: يولّد العميل من schema.sqlite.prisma (قاعدة بيانات التطوير)
// يُستدعى تلقائيًا من: postinstall و build في package.json
// (مهم لأن Vercel قد يشغّل postinstall أو build — كلاهما آمن الآن)

const { execSync } = require("child_process");

const isVercel = Boolean(process.env.VERCEL);
const schema = isVercel ? "prisma/schema.postgres.prisma" : "prisma/schema.sqlite.prisma";

console.log(
  `[prisma-generate] بيئة: ${isVercel ? "Vercel → PostgreSQL/Supabase" : "محلي → SQLite"} | المخطط: ${schema}`
);

try {
  execSync(`npx prisma generate --schema ${schema}`, { stdio: "inherit" });
  console.log("[prisma-generate] تم توليد Prisma Client بنجاح ✓");
} catch (err) {
  console.error("[prisma-generate] فشل توليد Prisma Client ✗");
  process.exit(1);
}

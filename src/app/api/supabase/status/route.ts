import { db } from "@/lib/db";

// GET /api/supabase/status — فحص جاهزية ربط Supabase
// يعيد: هل متغيرات البيئة مضبوطة؟ + اختبار اتصال حقيقي عند التهيئة
export async function GET() {
  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const dbUrl = process.env.SUPABASE_DB_URL || "";

    const configured = Boolean(url && (anonKey || serviceKey));

    // إخفاء القيم الحساسة في الاستجابة
    const mask = (v: string) =>
      v ? `${v.slice(0, 14)}…${v.slice(-4)}` : "";

    let connection: "ok" | "failed" | "not_configured" = "not_configured";
    let projectHost = "";

    if (configured) {
      try {
        projectHost = new URL(url).host;
        // نقطة النهاية الجذرية /rest/v1/ تقبل service_role فقط حديثًا في Supabase،
        // لذلك نفضّل service_key ثم anon كخيار احتياطي
        const checkKey = serviceKey || anonKey;
        const res = await fetch(`${url}/rest/v1/?apikey=${checkKey}`, {
          headers: {
            apikey: checkKey,
            Authorization: `Bearer ${checkKey}`,
          },
          signal: AbortSignal.timeout(6000),
        });
        connection = res.ok ? "ok" : "failed";
      } catch {
        connection = "failed";
      }
    }

    // فحص قاعدة البيانات المحلية (SQLite) للتأكد من عمل التطبيق الحالي
    const localDbOk = await db
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    return Response.json({
      configured,
      connection,
      projectHost,
      url: mask(url),
      anonKey: mask(anonKey),
      serviceKey: Boolean(serviceKey),
      dbUrl: Boolean(dbUrl),
      localDbOk,
      files: {
        schema: "supabase/schema.sql",
        seed: "supabase/seed.sql",
        guide: "supabase/README.md",
      },
    });
  } catch (e) {
    console.error("[supabase:status]", e);
    return Response.json({ error: "خطأ في فحص حالة Supabase" }, { status: 500 });
  }
}

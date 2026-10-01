import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireAdmin, type SafeUser } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────
// مساعدات موحدة لكل الـ API Routes: استجابات JSON، حماية الصلاحيات،
// تسجيل الأنشطة (Logging — القسم 6)، وتحقق من المدخلات (القسم 16)
// ─────────────────────────────────────────────────────────────

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data as object, { status: init ?? 200 });
}

export function fail(message: string, status = 400, extra?: object) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export const ERR = {
  unauthorized: () => fail("يجب تسجيل الدخول للوصول إلى هذا المحتوى", 401),
  forbidden: () => fail("ليس لديك صلاحية للقيام بهذا الإجراء", 403),
  notFound: (what = "العنصر") => fail(`${what} غير موجود`, 404),
  badRequest: (m = "بيانات غير صالحة") => fail(m, 422),
  server: () =>
    // تشخيص واضح: إذا كان DATABASE_URL مفقودًا على السيرفر (نشر على Vercel بدون متغيرات)
    !process.env.DATABASE_URL
      ? fail(
          "قاعدة البيانات غير مربوطة على السيرفر — أضف متغير DATABASE_URL في إعدادات Vercel ثم أعد النشر",
          503
        )
      : fail("حدث خطأ غير متوقع في الخادم", 500),
};

/** المستخدم الحالي أو 401 */
export async function authGuard(): Promise<
  { user: SafeUser; response: null } | { user: null; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: ERR.unauthorized() };
  return { user, response: null };
}

/** Admin أو 403 */
export async function adminGuard(): Promise<
  { user: SafeUser; response: null } | { user: null; response: NextResponse }
> {
  const user = await requireAdmin();
  if (!user) {
    const current = await getCurrentUser();
    return {
      user: null,
      response: current ? ERR.forbidden() : ERR.unauthorized(),
    };
  }
  return { user, response: null };
}

/** تسجيل حدث في سجل الأنشطة */
export async function logActivity(entry: {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  detail?: string;
  level?: "INFO" | "WARN" | "ERROR";
}) {
  try {
    await db.activityLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorName: entry.actorName ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        detail: entry.detail ?? null,
        level: entry.level ?? "INFO",
      },
    });
  } catch (e) {
    console.error("[logger] failed to write activity log:", e);
  }
}

/** Rate limiting بسيط في الذاكرة للعمليات الحساسة (القسم 16) */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clean(str: unknown, max = 500): string {
  return String(str ?? "").trim().slice(0, max);
}

export function toInt(val: unknown, fallback = 0): number {
  const n = parseInt(String(val), 10);
  return Number.isFinite(n) ? n : fallback;
}

/** توليد slug فريد من العنوان (يدعم اللاتينية، وإلا يولد معرفًا) */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/[\u0600-\u06FF]/g, "") // إزالة العربية من الـ slug
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return base ? `${base}-${suffix}` : `course-${suffix}`;
}

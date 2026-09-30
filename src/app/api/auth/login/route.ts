import { db } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import {
  clean,
  ERR,
  fail,
  logActivity,
  ok,
  rateLimit,
} from "@/lib/api-helpers";

// POST /api/auth/login — تسجيل الدخول (FR-01)
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!rateLimit(`login:${ip}`, 10, 60_000)) {
      return fail("عدد كبير من محاولات الدخول، يرجى المحاولة بعد دقيقة", 429);
    }

    const body = await req.json().catch(() => null);
    if (!body) return ERR.badRequest("بيانات الطلب غير صالحة");

    const email = clean(body.email, 160).toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) return ERR.badRequest("أدخل البريد وكلمة المرور");

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      await logActivity({
        action: "LOGIN_FAILED",
        detail: `محاولة دخول فاشلة: ${email}`,
        level: "WARN",
      });
      return fail("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);
    }
    if (!user.isActive) return fail("هذا الحساب معطّل، تواصل مع الإدارة", 403);

    await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      action: "LOGIN",
      detail: `تسجيل دخول: ${user.email}`,
    });

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[login]", e);
    return ERR.server();
  }
}

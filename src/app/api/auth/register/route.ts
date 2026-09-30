import { db } from "@/lib/db";
import {
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import {
  clean,
  ERR,
  fail,
  logActivity,
  ok,
  rateLimit,
} from "@/lib/api-helpers";

// POST /api/auth/register — إنشاء حساب جديد (FR-01)
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!rateLimit(`register:${ip}`, 8, 60_000)) {
      return fail("عدد كبير من المحاولات، يرجى المحاولة بعد دقيقة", 429);
    }

    const body = await req.json().catch(() => null);
    if (!body) return ERR.badRequest("بيانات الطلب غير صالحة");

    const name = clean(body.name, 80);
    const email = clean(body.email, 160).toLowerCase();
    const password = String(body.password ?? "");

    if (name.length < 2) return ERR.badRequest("الاسم يجب أن يكون حرفين على الأقل");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return ERR.badRequest("البريد الإلكتروني غير صالح");
    if (password.length < 6)
      return ERR.badRequest("كلمة المرور يجب أن تكون 6 أحرف على الأقل");

    const exists = await db.user.findUnique({ where: { email } });
    if (exists) return fail("هذا البريد الإلكتروني مسجل مسبقًا", 409);

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role: "STUDENT",
      },
    });

    await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      action: "REGISTER",
      detail: `إنشاء حساب جديد: ${user.email}`,
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
    console.error("[register]", e);
    return ERR.server();
  }
}

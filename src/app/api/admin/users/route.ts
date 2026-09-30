import { db } from "@/lib/db";
import { adminGuard, ERR, fail, logActivity, ok } from "@/lib/api-helpers";

// GET /api/admin/users — قائمة المستخدمين مع إحصائياتهم
export async function GET(req: Request) {
  const guard = await adminGuard();
  if (guard.response) return guard.response;

  const page = Math.max(1, parseInt(new URL(req.url).searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = 20;

  const [users, total] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { enrollments: true, progress: true } },
      },
    }),
    db.user.count(),
  ]);

  return ok({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      enrollments: u._count.enrollments,
      progressRecords: u._count.progress,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  });
}

// PATCH /api/admin/users — تعديل دور مستخدم / تفعيل أو تعطيل
export async function PATCH(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body?.id) return ERR.badRequest("معرف المستخدم مطلوب");

    const target = await db.user.findUnique({ where: { id: String(body.id) } });
    if (!target) return ERR.notFound("المستخدم");

    // حماية: لا يمكن للأدمن تعطيل نفسه أو تغيير دوره
    if (target.id === guard.user.id)
      return fail("لا يمكنك تعديل حسابك الإداري من هنا", 422);

    const data: Record<string, unknown> = {};
    if (body.role !== undefined && ["ADMIN", "STUDENT"].includes(body.role))
      data.role = body.role;
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const user = await db.user.update({ where: { id: target.id }, data });

    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "USER_UPDATE",
      entity: "user",
      entityId: user.id,
      detail: `تعديل مستخدم ${user.name} (الدور: ${user.role}، الحالة: ${user.isActive ? "مفعل" : "معطل"})`,
      level: "WARN",
    });

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (e) {
    console.error("[admin:users:update]", e);
    return ERR.server();
  }
}

import { db } from "@/lib/db";
import { adminGuard, clean, ERR, fail, logActivity, ok } from "@/lib/api-helpers";

// POST /api/admin/links — إضافة رابط/ملف لدرس (FR-11)
export async function POST(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body) return ERR.badRequest();

    const title = clean(body.title, 160);
    const url = clean(body.url, 600);
    const lessonId = clean(body.lessonId, 50);

    if (title.length < 2) return fail("عنوان الرابط قصير جدًا", 422);
    if (!/^https?:\/\/.+/i.test(url)) return fail("رابط غير صالح (يجب أن يبدأ بـ http)", 422);

    const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return ERR.notFound("الدرس");

    const type = ["link", "file", "github", "doc"].includes(body.type) ? body.type : "link";

    const link = await db.lessonLink.create({
      data: { lessonId, title, url, type },
    });

    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "LINK_CREATE",
      entity: "link",
      entityId: link.id,
      detail: `إضافة رابط «${title}» إلى درس: ${lesson.title}`,
    });

    return ok({ link }, 201);
  } catch (e) {
    console.error("[admin:links:create]", e);
    return ERR.server();
  }
}

// DELETE /api/admin/links?id=
export async function DELETE(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ERR.badRequest("معرف الرابط مطلوب");

    const link = await db.lessonLink.findUnique({ where: { id } });
    if (!link) return ERR.notFound("الرابط");

    await db.lessonLink.delete({ where: { id } });
    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "LINK_DELETE",
      entity: "link",
      entityId: id,
      detail: `حذف رابط: ${link.title}`,
      level: "WARN",
    });

    return ok({ success: true });
  } catch (e) {
    console.error("[admin:links:delete]", e);
    return ERR.server();
  }
}

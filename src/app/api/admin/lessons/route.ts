import { db } from "@/lib/db";
import { adminGuard, clean, ERR, fail, logActivity, ok, toInt } from "@/lib/api-helpers";

// GET /api/admin/lessons?courseId= — دروس كورس معين
export async function GET(req: Request) {
  const guard = await adminGuard();
  if (guard.response) return guard.response;

  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return ERR.badRequest("معرف الكورس مطلوب");

  const lessons = await db.lesson.findMany({
    where: { courseId },
    orderBy: { orderIndex: "asc" },
    include: { _count: { select: { links: true, progress: true } } },
  });

  return ok({
    lessons: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      orderIndex: l.orderIndex,
      duration: l.duration,
      driveFileId: l.driveFileId,
      videoUrl: l.videoUrl,
      videoSource: l.videoSource,
      status: l.status,
      linksCount: l._count.links,
      watchersCount: l._count.progress,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}

// POST /api/admin/lessons — إضافة درس (FR-10, FR-12)
export async function POST(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body) return ERR.badRequest();

    const title = clean(body.title, 160);
    const courseId = clean(body.courseId, 50);
    if (title.length < 3) return fail("عنوان الدرس قصير جدًا", 422);

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return ERR.notFound("الكورس");

    const last = await db.lesson.findFirst({
      where: { courseId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const videoSource = body.videoSource === "drive" ? "drive" : "direct";

    const lesson = await db.lesson.create({
      data: {
        courseId,
        title,
        description: clean(body.description, 3000) || null,
        orderIndex: body.orderIndex !== undefined ? toInt(body.orderIndex) : (last?.orderIndex ?? -1) + 1,
        duration: Math.max(0, toInt(body.duration, 0)),
        driveFileId: videoSource === "drive" ? clean(body.driveFileId, 120) || null : null,
        videoUrl: videoSource === "direct" ? clean(body.videoUrl, 600) || null : null,
        videoSource,
        status: body.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
      },
    });

    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "LESSON_CREATE",
      entity: "lesson",
      entityId: lesson.id,
      detail: `إضافة درس «${lesson.title}» إلى كورس: ${course.title}`,
    });

    return ok({ lesson }, 201);
  } catch (e) {
    console.error("[admin:lessons:create]", e);
    return ERR.server();
  }
}

// PATCH /api/admin/lessons — تعديل درس / تغيير ترتيبه / تفعيل وتعطيل
export async function PATCH(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body?.id) return ERR.badRequest("معرف الدرس مطلوب");

    const existing = await db.lesson.findUnique({ where: { id: String(body.id) } });
    if (!existing) return ERR.notFound("الدرس");

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = clean(body.title, 160);
      if (title.length < 3) return fail("عنوان الدرس قصير جدًا", 422);
      data.title = title;
    }
    if (body.description !== undefined)
      data.description = clean(body.description, 3000) || null;
    if (body.duration !== undefined) data.duration = Math.max(0, toInt(body.duration));
    if (body.orderIndex !== undefined) data.orderIndex = toInt(body.orderIndex);
    if (body.status !== undefined && ["DRAFT", "PUBLISHED"].includes(body.status))
      data.status = body.status;
    if (body.videoSource !== undefined && ["direct", "drive"].includes(body.videoSource)) {
      data.videoSource = body.videoSource;
      if (body.videoSource === "drive") {
        data.driveFileId = clean(body.driveFileId ?? existing.driveFileId, 120) || null;
        data.videoUrl = null;
      } else {
        data.videoUrl = clean(body.videoUrl ?? existing.videoUrl, 600) || null;
        data.driveFileId = null;
      }
    } else {
      if (body.driveFileId !== undefined)
        data.driveFileId = clean(body.driveFileId, 120) || null;
      if (body.videoUrl !== undefined) data.videoUrl = clean(body.videoUrl, 600) || null;
    }

    const lesson = await db.lesson.update({ where: { id: existing.id }, data });

    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "LESSON_UPDATE",
      entity: "lesson",
      entityId: lesson.id,
      detail: `تعديل درس: ${lesson.title}`,
    });

    return ok({ lesson });
  } catch (e) {
    console.error("[admin:lessons:update]", e);
    return ERR.server();
  }
}

// DELETE /api/admin/lessons?id= — حذف درس
export async function DELETE(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ERR.badRequest("معرف الدرس مطلوب");

    const lesson = await db.lesson.findUnique({ where: { id } });
    if (!lesson) return ERR.notFound("الدرس");

    await db.lesson.delete({ where: { id } });
    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "LESSON_DELETE",
      entity: "lesson",
      entityId: id,
      detail: `حذف درس: ${lesson.title}`,
      level: "WARN",
    });

    return ok({ success: true });
  } catch (e) {
    console.error("[admin:lessons:delete]", e);
    return ERR.server();
  }
}

import { db } from "@/lib/db";
import { adminGuard, clean, ERR, fail, logActivity, ok, slugify } from "@/lib/api-helpers";

// GET /api/admin/courses — كل الكورسات (حتى المسودات)
export async function GET() {
  const guard = await adminGuard();
  if (guard.response) return guard.response;

  const courses = await db.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { lessons: true, enrollments: true } },
    },
  });

  return ok({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      thumbnail: c.thumbnail,
      status: c.status,
      sortOrder: c.sortOrder,
      lessonsCount: c._count.lessons,
      enrollmentsCount: c._count.enrollments,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

// POST /api/admin/courses — إضافة كورس (FR-10)
export async function POST(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body) return ERR.badRequest();

    const title = clean(body.title, 160);
    if (title.length < 3) return fail("عنوان الكورس قصير جدًا", 422);

    const slug = clean(body.slug, 100) || slugify(title);
    const exists = await db.course.findUnique({ where: { slug } });
    if (exists) return fail("الرابط اللطيف (slug) مستخدم بالفعل", 409);

    const course = await db.course.create({
      data: {
        title,
        slug,
        description: clean(body.description, 2000) || null,
        thumbnail: clean(body.thumbnail, 500) || null,
        status: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(body.status)
          ? body.status
          : "DRAFT",
        sortOrder: Number(body.sortOrder) || 0,
      },
    });

    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "COURSE_CREATE",
      entity: "course",
      entityId: course.id,
      detail: `إضافة كورس: ${course.title}`,
    });

    return ok({ course }, 201);
  } catch (e) {
    console.error("[admin:courses:create]", e);
    return ERR.server();
  }
}

// PATCH /api/admin/courses — تعديل كورس
export async function PATCH(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body?.id) return ERR.badRequest("معرف الكورس مطلوب");

    const existing = await db.course.findUnique({ where: { id: String(body.id) } });
    if (!existing) return ERR.notFound("الكورس");

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = clean(body.title, 160);
      if (title.length < 3) return fail("عنوان الكورس قصير جدًا", 422);
      data.title = title;
    }
    if (body.slug !== undefined && clean(body.slug)) {
      const slug = clean(body.slug, 100);
      const conflict = await db.course.findFirst({
        where: { slug, id: { not: existing.id } },
      });
      if (conflict) return fail("الرابط اللطيف مستخدم بالفعل", 409);
      data.slug = slug;
    }
    if (body.description !== undefined)
      data.description = clean(body.description, 2000) || null;
    if (body.thumbnail !== undefined)
      data.thumbnail = clean(body.thumbnail, 500) || null;
    if (body.status !== undefined && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(body.status))
      data.status = body.status;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

    const course = await db.course.update({
      where: { id: existing.id },
      data,
    });

    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "COURSE_UPDATE",
      entity: "course",
      entityId: course.id,
      detail: `تعديل كورس: ${course.title}`,
    });

    return ok({ course });
  } catch (e) {
    console.error("[admin:courses:update]", e);
    return ERR.server();
  }
}

// DELETE /api/admin/courses?id= — حذف كورس
export async function DELETE(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ERR.badRequest("معرف الكورس مطلوب");

    const course = await db.course.findUnique({ where: { id } });
    if (!course) return ERR.notFound("الكورس");

    await db.course.delete({ where: { id } });
    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "COURSE_DELETE",
      entity: "course",
      entityId: id,
      detail: `حذف كورس: ${course.title}`,
      level: "WARN",
    });

    return ok({ success: true });
  } catch (e) {
    console.error("[admin:courses:delete]", e);
    return ERR.server();
  }
}

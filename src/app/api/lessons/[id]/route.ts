import { db } from "@/lib/db";
import { authGuard, ERR, logActivity, ok } from "@/lib/api-helpers";

// GET /api/lessons/[id] — صفحة الدرس: الفيديو + الوصف + الروابط + التقدم (FR-04, FR-05)
// يتطلب تسجيل دخول (FR-13)، ويقوم بالتسجيل في الكورس تلقائيًا عند أول زيارة
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await authGuard();
    if (guard.response) return guard.response;
    const user = guard.user;

    const { id } = await params;
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: { links: { orderBy: { createdAt: "asc" } } },
    });
    if (!lesson || lesson.status !== "PUBLISHED") return ERR.notFound("الدرس");

    const course = await db.course.findUnique({
      where: { id: lesson.courseId },
      select: { id: true, title: true, slug: true, status: true },
    });
    if (!course || course.status !== "PUBLISHED") return ERR.notFound("الكورس");

    // تسجيل تلقائي في الكورس عند أول فتح (قرار القسم 20: كورسات مفتوحة مع Enrollment تلقائي)
    const enrollment = await db.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    if (!enrollment) {
      await db.courseEnrollment.create({
        data: { userId: user.id, courseId: course.id },
      });
      await logActivity({
        actorId: user.id,
        actorName: user.name,
        action: "ENROLL",
        entity: "course",
        entityId: course.id,
        detail: `تسجيل في كورس: ${course.title}`,
      });
    }

    // جيران الدرس (السابق/التالي) بنفس الترتيب
    const siblings = await db.lesson.findMany({
      where: { courseId: course.id, status: "PUBLISHED" },
      orderBy: { orderIndex: "asc" },
      select: { id: true, title: true, orderIndex: true },
    });
    const idx = siblings.findIndex((s) => s.id === lesson.id);

    const progress = await db.progress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    });

    return ok({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        driveFileId: lesson.driveFileId,
        videoUrl: lesson.videoUrl,
        videoSource: lesson.videoSource,
        orderIndex: lesson.orderIndex,
      },
      course,
      links: lesson.links,
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
      progress: progress
        ? {
            lastPosition: progress.lastPosition,
            progressPercent: progress.progressPercent,
            completed: progress.completed,
            updatedAt: progress.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (e) {
    console.error("[lesson:detail]", e);
    return ERR.server();
  }
}

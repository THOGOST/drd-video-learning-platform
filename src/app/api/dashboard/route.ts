import { db } from "@/lib/db";
import { authGuard, ERR, ok } from "@/lib/api-helpers";

// GET /api/dashboard — لوحة المستخدم: الكورسات + نسب الإنجاز + آخر درس (User Dashboard)
export async function GET() {
  try {
    const guard = await authGuard();
    if (guard.response) return guard.response;
    const user = guard.user;

    const enrollments = await db.courseEnrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            lessons: {
              where: { status: "PUBLISHED" },
              orderBy: { orderIndex: "asc" },
              select: { id: true, title: true, duration: true, orderIndex: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const allLessonIds = enrollments.flatMap((e) => e.course.lessons.map((l) => l.id));
    const progressRows =
      allLessonIds.length > 0
        ? await db.progress.findMany({
            where: { userId: user.id, lessonId: { in: allLessonIds } },
            orderBy: { updatedAt: "desc" },
          })
        : [];

    const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));
    const lastActivityAt = progressRows[0]?.updatedAt ?? null;

    const courses = enrollments.map((e) => {
      const lessons = e.course.lessons;
      const completed = lessons.filter(
        (l) => progressByLesson.get(l.id)?.completed
      ).length;
      const percent =
        lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
      const continueTarget =
        lessons.find((l) => {
          const p = progressByLesson.get(l.id);
          return !p || !p.completed;
        }) ?? lessons[0];
      const continueProgress = continueTarget
        ? progressByLesson.get(continueTarget.id) ?? null
        : null;

      return {
        id: e.course.id,
        title: e.course.title,
        slug: e.course.slug,
        thumbnail: e.course.thumbnail,
        lessonsCount: lessons.length,
        completedCount: completed,
        percent,
        continueLesson: continueTarget
          ? {
              id: continueTarget.id,
              title: continueTarget.title,
              lastPosition: continueProgress?.lastPosition ?? 0,
              percent: continueProgress?.progressPercent ?? 0,
            }
          : null,
        enrolledAt: e.createdAt.toISOString(),
      };
    });

    const totalLessons = courses.reduce((s, c) => s + c.lessonsCount, 0);
    const totalCompleted = courses.reduce((s, c) => s + c.completedCount, 0);
    const watchedSeconds = progressRows.reduce((s, p) => s + p.lastPosition, 0);

    return ok({
      stats: {
        coursesCount: courses.length,
        totalLessons,
        totalCompleted,
        overallPercent:
          totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0,
        watchedMinutes: Math.round(watchedSeconds / 60),
        lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      },
      courses,
    });
  } catch (e) {
    console.error("[dashboard]", e);
    return ERR.server();
  }
}

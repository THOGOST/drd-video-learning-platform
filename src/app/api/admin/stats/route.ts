import { db } from "@/lib/db";
import { adminGuard, ERR, ok } from "@/lib/api-helpers";

// GET /api/admin/stats — إحصائيات عامة للوحة الإدارة
export async function GET() {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const [users, courses, lessons, enrollments, completedProgress, activity] =
      await Promise.all([
        db.user.count(),
        db.course.count(),
        db.lesson.count(),
        db.courseEnrollment.count(),
        db.progress.count({ where: { completed: true } }),
        db.activityLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

    // أكثر الكورسات تسجيلًا
    const topCourses = await db.courseEnrollment.groupBy({
      by: ["courseId"],
      _count: { courseId: true },
      orderBy: { _count: { courseId: "desc" } },
      take: 5,
    });
    const topCoursesData = await db.course.findMany({
      where: { id: { in: topCourses.map((t) => t.courseId) } },
      select: { id: true, title: true },
    });

    return ok({
      stats: {
        users,
        courses,
        lessons,
        enrollments,
        completedLessons: completedProgress,
      },
      topCourses: topCourses.map((t) => ({
        title: topCoursesData.find((c) => c.id === t.courseId)?.title ?? "—",
        enrollments: t._count.courseId,
      })),
      activity: activity.map((a) => ({
        id: a.id,
        actorName: a.actorName,
        action: a.action,
        entity: a.entity,
        detail: a.detail,
        level: a.level,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[admin:stats]", e);
    return ERR.server();
  }
}

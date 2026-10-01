import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, ERR } from "@/lib/api-helpers";

// GET /api/courses — قائمة الكورسات المنشورة مع تقدم المستخدم (FR-02)
export async function GET() {
  try {
    const user = await getCurrentUser();

    const courses = await db.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { lessons: { where: { status: "PUBLISHED" } } } },
      },
    });

    let progressMap = new Map<string, { completed: number; percent: number }>();
    if (user) {
      const lessons = await db.lesson.findMany({
        where: { status: "PUBLISHED", courseId: { in: courses.map((c) => c.id) } },
        select: { id: true, courseId: true },
      });
      const progress = await db.progress.findMany({
        where: { userId: user.id, completed: true, lessonId: { in: lessons.map((l) => l.id) } },
        select: { lessonId: true },
      });
      const completedByCourse = new Map<string, number>();
      const courseIdOfLesson = new Map(lessons.map((l) => [l.id, l.courseId]));
      for (const p of progress) {
        const cid = courseIdOfLesson.get(p.lessonId);
        if (cid) completedByCourse.set(cid, (completedByCourse.get(cid) ?? 0) + 1);
      }
      progressMap = new Map(
        courses.map((c) => {
          const done = completedByCourse.get(c.id) ?? 0;
          const total = c._count.lessons;
          return [
            c.id,
            { completed: done, percent: total > 0 ? Math.round((done / total) * 100) : 0 },
          ];
        })
      );
    }

    return ok({
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        thumbnail: c.thumbnail,
        lessonsCount: c._count.lessons,
        progress: user ? progressMap.get(c.id) ?? { completed: 0, percent: 0 } : null,
      })),
    });
  } catch (e) {
    console.error("[courses:list]", e);
    return ERR.server();
  }
}

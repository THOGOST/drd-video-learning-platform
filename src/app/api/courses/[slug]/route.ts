import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ERR, ok } from "@/lib/api-helpers";
import { getLockedLessonIds } from "@/lib/quiz-lock";

// GET /api/courses/[slug] — تفاصيل الكورس + الدروس بحالتها (FR-03)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();

    const course = await db.course.findUnique({
      where: { slug },
      include: {
        lessons: {
          where: { status: "PUBLISHED" },
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            orderIndex: true,
            duration: true,
          },
        },
      },
    });

    if (!course || course.status === "ARCHIVED") return ERR.notFound("الكورس");

    const progressByLesson = new Map<string, { percent: number; completed: boolean; lastPosition: number }>();
    if (user && course.lessons.length > 0) {
      const rows = await db.progress.findMany({
        where: { userId: user.id, lessonId: { in: course.lessons.map((l) => l.id) } },
      });
      for (const r of rows) {
        progressByLesson.set(r.lessonId, {
          percent: r.progressPercent,
          completed: r.completed,
          lastPosition: r.lastPosition,
        });
      }
    }

    const lessons = course.lessons.map((l) => {
      const p = progressByLesson.get(l.id);
      return {
        ...l,
        progress: user ? p ?? null : null,
        status: p ? (p.completed ? "COMPLETED" : p.percent > 0 ? "IN_PROGRESS" : "NOT_STARTED") : "NOT_STARTED",
      };
    });

    // القفل: الدرس التالي لدرس فيه اختبار غير مجتاز (المدير مستثنى)
    const lockedSet =
      user && user.role !== "ADMIN"
        ? await getLockedLessonIds(course.id, user.id)
        : new Set<string>();

    const completedCount = lessons.filter((l) => l.status === "COMPLETED").length;
    const percent =
      lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

    const firstIncomplete = lessons.find((l) => l.status !== "COMPLETED");

    return ok({
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
        status: course.status,
      },
      lessons: lessons.map((l) => ({ ...l, locked: lockedSet.has(l.id) })),
      percent,
      completedCount,
      continueLessonId: user
        ? (firstIncomplete ?? lessons[0])?.id ?? null
        : null,
    });
  } catch (e) {
    console.error("[course:detail]", e);
    return ERR.server();
  }
}

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

    // ─── «أكمل من حيث توقفت»: آخر درس غير مكتمل شوهدته (مفروز بحدث updated_at) ───
    const lessonInfo = new Map<string, { title: string; course: (typeof courses)[number] }>();
    for (const e of enrollments) {
      const courseOut = courses.find((c) => c.id === e.course.id)!;
      for (const l of e.course.lessons) lessonInfo.set(l.id, { title: l.title, course: courseOut });
    }
    const activeRow = progressRows.find(
      (p) => !p.completed && lessonInfo.has(p.lessonId) && p.progressPercent > 0
    );
    let continueWatching: {
      lessonId: string;
      lessonTitle: string;
      courseTitle: string;
      courseSlug: string;
      percent: number;
    } | null = null;
    if (activeRow) {
      const info = lessonInfo.get(activeRow.lessonId)!;
      continueWatching = {
        lessonId: activeRow.lessonId,
        lessonTitle: info.title,
        courseTitle: info.course.title,
        courseSlug: info.course.slug,
        percent: activeRow.progressPercent,
      };
    }

    // ─── النشاط الأسبوعي (آخر 7 أيام): دروس مكتملة + دقائق مشاهدة ───
    const now = new Date();
    const dayLabels = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const buckets = new Map<string, { label: string; completed: number; minutes: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      buckets.set(key, { label: dayLabels[d.getDay()], completed: 0, minutes: 0 });
    }

    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const completions = await db.activityLog.findMany({
      where: { actorId: user.id, action: "LESSON_COMPLETE", createdAt: { gte: weekStart } },
      select: { createdAt: true },
    });
    for (const c of completions) {
      const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}-${String(c.createdAt.getDate()).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.completed += 1;
    }
    for (const p of progressRows) {
      const key = `${p.updatedAt.getFullYear()}-${String(p.updatedAt.getMonth() + 1).padStart(2, "0")}-${String(p.updatedAt.getDate()).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.minutes += Math.round(p.lastPosition / 60);
    }

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
      continueWatching,
      weeklyActivity: Array.from(buckets.entries()).map(([key, v]) => ({
        day: key,
        label: v.label,
        completed: v.completed,
        minutes: v.minutes,
      })),
      courses,
    });
  } catch (e) {
    console.error("[dashboard]", e);
    return ERR.server();
  }
}

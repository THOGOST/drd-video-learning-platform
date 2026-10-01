import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────
// قاعدة قفل الدروس بالاختبار:
// الدرس يكون مقفولًا إذا كان الدرس الذي يسبقه مباشرة في الترتيب
// يحتوي اختبارًا ولم يجتزه المستخدم بعد. الدروس بلا اختبار لا تمنع التقدم.
// ملاحظة: نمرر userId = null للمدير (ADMIN) لتجاوز القفل تمامًا.
// ─────────────────────────────────────────────────────────────

export async function getQuizLessonIds(courseId: string): Promise<Set<string>> {
  const rows = await db.quizQuestion.findMany({
    where: { lesson: { courseId } },
    select: { lessonId: true },
    distinct: ["lessonId"],
  });
  return new Set(rows.map((r) => r.lessonId));
}

export async function getPassedQuizIds(
  userId: string,
  quizLessonIds: Set<string>
): Promise<Set<string>> {
  if (quizLessonIds.size === 0) return new Set();
  const rows = await db.quizPass.findMany({
    where: { userId, lessonId: { in: [...quizLessonIds] } },
    select: { lessonId: true },
  });
  return new Set(rows.map((r) => r.lessonId));
}

/**
 * يعيد معرّفات الدروس المقفولة في كورس معين لمستخدم معين.
 * userId = null يعني تجاوز القفل (زائر يرى كل شيء مفتوحًا في القائمة،
 * أو مدير — التطبيق الفعلي يمنع الزوار من الدروس أصلًا).
 */
export async function getLockedLessonIds(
  courseId: string,
  userId: string | null
): Promise<Set<string>> {
  const locked = new Set<string>();
  if (!userId) return locked;

  const lessons = await db.lesson.findMany({
    where: { courseId, status: "PUBLISHED" },
    orderBy: { orderIndex: "asc" },
    select: { id: true },
  });
  if (lessons.length < 2) return locked;

  const quizLessonIds = await getQuizLessonIds(courseId);
  if (quizLessonIds.size === 0) return locked;

  const passed = await getPassedQuizIds(userId, quizLessonIds);

  for (let i = 1; i < lessons.length; i++) {
    const prev = lessons[i - 1];
    if (quizLessonIds.has(prev.id) && !passed.has(prev.id)) {
      locked.add(lessons[i].id);
    }
  }
  return locked;
}

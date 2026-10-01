import { db } from "@/lib/db";
import { authGuard, ERR, fail, logActivity, ok } from "@/lib/api-helpers";

// ─────────────────────────────────────────────────────────────
// اختبار الدرس (FR جديد: اختبارات قصيرة بعد الدرس)
// GET  /api/lessons/[id]/quiz — أسئلة الدرس (بدون الإجابات الصحيحة) + حالة الاجتياز
// POST /api/lessons/[id]/quiz — تسليم الإجابات والتصحيح ومنح الاجتياز عند الإجابة الصحيحة كاملة
// ─────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await authGuard();
    if (guard.response) return guard.response;

    const { id } = await params;
    const questions = await db.quizQuestion.findMany({
      where: { lessonId: id },
      orderBy: { orderIndex: "asc" },
    });
    const pass = await db.quizPass.findUnique({
      where: { userId_lessonId: { userId: guard.user.id, lessonId: id } },
    });

    return ok({
      passed: Boolean(pass),
      score: pass?.score ?? null,
      total: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options) as string[],
        orderIndex: q.orderIndex,
      })),
    });
  } catch (e) {
    console.error("[quiz:get]", e);
    return ERR.server();
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await authGuard();
    if (guard.response) return guard.response;
    const user = guard.user;

    const { id } = await params;
    const body = (await req.json().catch(() => null)) as
      | { answers?: Record<string, number> }
      | null;
    if (!body?.answers || typeof body.answers !== "object")
      return fail("لم تُرسل أي إجابات", 422);

    const questions = await db.quizQuestion.findMany({
      where: { lessonId: id },
      orderBy: { orderIndex: "asc" },
    });
    if (questions.length === 0) return fail("لا يوجد اختبار لهذا الدرس", 404);

    let score = 0;
    const correctAnswers: Record<string, number> = {};
    for (const q of questions) {
      correctAnswers[q.id] = q.correctIndex;
      const given = Number(body.answers[q.id]);
      if (Number.isInteger(given) && given === q.correctIndex) score += 1;
    }

    const total = questions.length;
    const passed = score === total;

    if (passed) {
      await db.quizPass.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: id } },
        create: { userId: user.id, lessonId: id, score, total },
        update: { score, total, passedAt: new Date() },
      });
      const lesson = await db.lesson.findUnique({
        where: { id },
        select: { title: true },
      });
      await logActivity({
        actorId: user.id,
        actorName: user.name,
        action: "QUIZ_PASS",
        entity: "lesson",
        entityId: id,
        detail: `اجتياز اختبار الدرس: ${lesson?.title ?? id} (${score}/${total})`,
      });
    }

    return ok({ passed, score, total, correctAnswers });
  } catch (e) {
    console.error("[quiz:submit]", e);
    return ERR.server();
  }
}

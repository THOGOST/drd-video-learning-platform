import { db } from "@/lib/db";
import { adminGuard, clean, ERR, fail, logActivity, ok, toInt } from "@/lib/api-helpers";

// ─────────────────────────────────────────────────────────────
// إدارة أسئلة اختبار الدرس (أدمن فقط)
// GET    /api/admin/quiz?lessonId= — أسئلة درس معين
// POST   /api/admin/quiz           — إضافة سؤال { lessonId, question, options[], correctIndex }
// PATCH  /api/admin/quiz           — تعديل سؤال { id, question?, options?, correctIndex?, orderIndex? }
// DELETE /api/admin/quiz?id=       — حذف سؤال
// ─────────────────────────────────────────────────────────────

function parseOptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const opts = raw.map((o) => clean(o, 300)).filter(Boolean);
  if (opts.length < 2 || opts.length > 6) return null;
  return opts;
}

export async function GET(req: Request) {
  const guard = await adminGuard();
  if (guard.response) return guard.response;

  const lessonId = new URL(req.url).searchParams.get("lessonId");
  if (!lessonId) return ERR.badRequest("معرف الدرس مطلوب");

  const questions = await db.quizQuestion.findMany({
    where: { lessonId },
    orderBy: { orderIndex: "asc" },
  });

  return ok({
    questions: questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options) as string[],
      correctIndex: q.correctIndex,
      orderIndex: q.orderIndex,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body) return ERR.badRequest();

    const lessonId = clean(body.lessonId, 50);
    const question = clean(body.question, 500);
    if (question.length < 3) return fail("نص السؤال قصير جدًا", 422);

    const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return ERR.notFound("الدرس");

    const options = parseOptions(body.options);
    if (!options) return fail("الخيارات يجب أن تكون من 2 إلى 6 خيارات غير فارغة", 422);

    const correctIndex = toInt(body.correctIndex, 0);
    if (correctIndex < 0 || correctIndex >= options.length)
      return fail("الإجابة الصحيحة خارج نطاق الخيارات", 422);

    const last = await db.quizQuestion.findFirst({
      where: { lessonId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const created = await db.quizQuestion.create({
      data: {
        lessonId,
        question,
        options: JSON.stringify(options),
        correctIndex,
        orderIndex: (last?.orderIndex ?? -1) + 1,
      },
    });

    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "QUIZ_QUESTION_CREATE",
      entity: "lesson",
      entityId: lessonId,
      detail: `إضافة سؤال لاختبار الدرس: ${lesson.title}`,
    });

    return ok(
      {
        question: {
          id: created.id,
          question: created.question,
          options,
          correctIndex: created.correctIndex,
          orderIndex: created.orderIndex,
        },
      },
      201
    );
  } catch (e) {
    console.error("[admin:quiz:create]", e);
    return ERR.server();
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body?.id) return ERR.badRequest("معرف السؤال مطلوب");

    const existing = await db.quizQuestion.findUnique({ where: { id: String(body.id) } });
    if (!existing) return ERR.notFound("السؤال");

    const data: Record<string, unknown> = {};

    if (body.question !== undefined) {
      const q = clean(body.question, 500);
      if (q.length < 3) return fail("نص السؤال قصير جدًا", 422);
      data.question = q;
    }
    if (body.options !== undefined) {
      const options = parseOptions(body.options);
      if (!options) return fail("الخيارات يجب أن تكون من 2 إلى 6 خيارات غير فارغة", 422);
      data.options = JSON.stringify(options);
    }
    if (body.correctIndex !== undefined) {
      const opts: string[] = data.options
        ? JSON.parse(data.options as string)
        : JSON.parse(existing.options);
      const idx = toInt(body.correctIndex, existing.correctIndex);
      if (idx < 0 || idx >= opts.length)
        return fail("الإجابة الصحيحة خارج نطاق الخيارات", 422);
      data.correctIndex = idx;
    }
    if (body.orderIndex !== undefined) data.orderIndex = toInt(body.orderIndex);

    const updated = await db.quizQuestion.update({ where: { id: existing.id }, data });

    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "QUIZ_QUESTION_UPDATE",
      entity: "lesson",
      entityId: existing.lessonId,
      detail: "تعديل سؤال في اختبار درس",
    });

    return ok({
      question: {
        id: updated.id,
        question: updated.question,
        options: JSON.parse(updated.options) as string[],
        correctIndex: updated.correctIndex,
        orderIndex: updated.orderIndex,
      },
    });
  } catch (e) {
    console.error("[admin:quiz:update]", e);
    return ERR.server();
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ERR.badRequest("معرف السؤال مطلوب");

    const existing = await db.quizQuestion.findUnique({ where: { id } });
    if (!existing) return ERR.notFound("السؤال");

    await db.quizQuestion.delete({ where: { id } });
    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "QUIZ_QUESTION_DELETE",
      entity: "lesson",
      entityId: existing.lessonId,
      detail: "حذف سؤال من اختبار درس",
      level: "WARN",
    });

    return ok({ success: true });
  } catch (e) {
    console.error("[admin:quiz:delete]", e);
    return ERR.server();
  }
}

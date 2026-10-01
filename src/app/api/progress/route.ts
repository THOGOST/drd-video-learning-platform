import { db } from "@/lib/db";
import { authGuard, ERR, ok, toInt } from "@/lib/api-helpers";

// POST /api/progress — حفظ تقدم المشاهدة تلقائيًا (FR-06, FR-07, FR-08)
// قاعدة الاكتمال: 90% (القسم 11 من الوثيقة)
// قاعدة عدم التراجع: التقدم المحفوظ لا يُخفض أبدًا
export async function POST(req: Request) {
  try {
    const guard = await authGuard();
    if (guard.response) return guard.response;
    const user = guard.user;

    const body = await req.json().catch(() => null);
    if (!body?.lessonId) return ERR.badRequest("معرف الدرس مطلوب");

    const lesson = await db.lesson.findUnique({
      where: { id: String(body.lessonId) },
      select: { id: true, courseId: true, status: true, duration: true },
    });
    if (!lesson || lesson.status !== "PUBLISHED") return ERR.notFound("الدرس");

    const lastPosition = Math.max(0, toInt(body.lastPosition, 0));
    let percent = Math.min(100, Math.max(0, toInt(body.progressPercent, 0)));

    // لو لم تصل نسبة من العميل، احسبها من الثواني مقابل مدة الدرس
    if (percent === 0 && lesson.duration > 0) {
      percent = Math.min(100, Math.round((lastPosition / lesson.duration) * 100));
    }

    const explicitComplete = body.completed === true;

    // منع التراجع: التقدم الموجود لا يُخفض أبدًا (حماية من فقدان التقدم)
    const existing = await db.progress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    });

    let finalPosition = lastPosition;
    if (existing) {
      if (existing.completed) {
        // درس مكتمل: يبقى مكتملًا ونسبته 100%؛ الموضع يُحدَّث فقط لإعادة المشاهدة
        percent = 100;
      } else {
        percent = Math.max(percent, existing.progressPercent);
        finalPosition = Math.max(lastPosition, existing.lastPosition);
      }
    }

    const completed = existing?.completed || explicitComplete || percent >= 90; // قاعدة الاكتمال 90%
    if (completed) percent = Math.max(percent, 100);

    // تسجيل لحظة الإكمال أول مرة في سجل الأنشطة (لتغذية إحصاءات النشاط الأسبوعي)
    const firstCompletion = completed && !existing?.completed;

    const saved = await db.progress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        lastPosition: finalPosition,
        progressPercent: percent,
        completed,
      },
      update: {
        lastPosition: { set: finalPosition },
        progressPercent: { set: percent },
        completed: { set: completed },
      },
    });

    if (firstCompletion) {
      await db.activityLog
        .create({
          data: {
            actorId: user.id,
            actorName: user.name,
            action: "LESSON_COMPLETE",
            entity: "lesson",
            entityId: lesson.id,
            detail: `أكمل الدرس: ${lesson.id}`,
            level: "INFO",
          },
        })
        .catch(() => undefined);
    }

    // تأكيد التسجيل في الكورس عند بدء المشاهدة
    await db.courseEnrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
      create: { userId: user.id, courseId: lesson.courseId },
      update: {},
    });

    return ok({
      progress: {
        lastPosition: saved.lastPosition,
        progressPercent: saved.progressPercent,
        completed: saved.completed,
        updatedAt: saved.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[progress:save]", e);
    return ERR.server();
  }
}

// GET /api/progress?lessonId= — جلب التقدم الحالي لدرس معين
export async function GET(req: Request) {
  try {
    const guard = await authGuard();
    if (guard.response) return guard.response;

    const lessonId = new URL(req.url).searchParams.get("lessonId");
    if (!lessonId) return ERR.badRequest("معرف الدرس مطلوب");

    const progress = await db.progress.findUnique({
      where: {
        userId_lessonId: { userId: guard.user.id, lessonId },
      },
    });

    return ok({
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
    console.error("[progress:get]", e);
    return ERR.server();
  }
}

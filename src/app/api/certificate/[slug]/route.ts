import { createHash } from "crypto";
import { db } from "@/lib/db";
import { authGuard, ERR, fail, ok } from "@/lib/api-helpers";

// ─────────────────────────────────────────────────────────────
// شهادة إتمام الكورس (FR جديد)
// GET /api/certificate/[slug] — بيانات الشهادة (يتطلب إتمام الكورس 100%)
// الكود المرجعي ثابت ومشتق من (المستخدم + الكورس) للتحقق لاحقًا.
// ─────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const guard = await authGuard();
    if (guard.response) return guard.response;
    const user = guard.user;

    const { slug } = await params;
    const course = await db.course.findUnique({
      where: { slug },
      include: {
        lessons: {
          where: { status: "PUBLISHED" },
          select: { id: true },
        },
      },
    });
    if (!course || course.status !== "PUBLISHED") return ERR.notFound("الكورس");
    if (course.lessons.length === 0) return fail("لا توجد دروس في هذا الكورس", 422);

    const progress = await db.progress.findMany({
      where: { userId: user.id, lessonId: { in: course.lessons.map((l) => l.id) } },
      select: { completed: true },
    });
    const completed = progress.filter((p) => p.completed).length;
    if (completed < course.lessons.length) {
      return fail("لم تكمل هذا الكورس بالكامل بعد — أنجز كل الدروس أولًا 🎯", 403);
    }

    const code = createHash("sha256")
      .update(`${user.id}:${course.id}:drd-certificate-v1`)
      .digest("hex")
      .slice(0, 16)
      .toUpperCase();

    return ok({
      studentName: user.name,
      courseTitle: course.title,
      lessonsCount: course.lessons.length,
      issuedAt: new Date().toISOString(),
      code,
    });
  } catch (e) {
    console.error("[certificate]", e);
    return ERR.server();
  }
}

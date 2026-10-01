import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────
// نظام الـ Workflow (القسم 12 من الوثيقة)
// منطق الأتمتة معزول هنا تمامًا عن واجهة المستخدم حتى يمكن
// استبداله لاحقًا بمزود Workflow خارجي (Cron / Temporal / n8n ...)
// ─────────────────────────────────────────────────────────────

export type WorkflowCheck = {
  id: string;
  severity: "OK" | "WARN" | "ERROR";
  message: string;
};

export type WorkflowResult = {
  name: string;
  status: "SUCCESS" | "WARNING" | "FAILED";
  checks: WorkflowCheck[];
  summary: string;
  ranAt: string;
};

/** فحص صحة بيانات الفيديو والمحتوى (Video Data Health Check) */
export async function runVideoHealthCheck(): Promise<WorkflowResult> {
  const checks: WorkflowCheck[] = [];

  // 1) الكورسات المنشورة بلا دروس
  const courses = await db.course.findMany({
    include: { _count: { select: { lessons: true } } },
  });
  for (const c of courses) {
    if (c.status === "PUBLISHED" && c._count.lessons === 0) {
      checks.push({
        id: `course-empty-${c.id}`,
        severity: "WARN",
        message: `الكورس المنشور «${c.title}» لا يحتوي على أي دروس`,
      });
    }
  }

  // 2) الدروس المنشورة بلا مصدر فيديو
  const lessons = await db.lesson.findMany();
  for (const l of lessons) {
    if (l.status === "PUBLISHED" && l.videoSource === "direct" && !l.videoUrl) {
      checks.push({
        id: `lesson-novideo-${l.id}`,
        severity: "ERROR",
        message: `الدرس المنشور «${l.title}» مضبوط على مصدر مباشر لكنه بلا رابط فيديو`,
      });
    }
    if (l.status === "PUBLISHED" && l.videoSource === "drive" && !l.driveFileId) {
      checks.push({
        id: `lesson-nodrive-${l.id}`,
        severity: "ERROR",
        message: `الدرس المنشور «${l.title}» مضبوط على Google Drive لكنه بلا File ID`,
      });
    }

    // 3) صحة صيغة Google Drive File ID
    if (l.driveFileId && !/^[A-Za-z0-9_-]{10,}$/.test(l.driveFileId)) {
      checks.push({
        id: `lesson-baddrive-${l.id}`,
        severity: "WARN",
        message: `معرف Google Drive للدرس «${l.title}» لا يبدو صحيحًا`,
      });
    }

    // 4) دروس بلا مدة مسجلة
    if (l.duration === 0 && l.status === "PUBLISHED") {
      checks.push({
        id: `lesson-noduration-${l.id}`,
        severity: "WARN",
        message: `الدرس «${l.title}» بلا مدة مسجلة (تقدير نسبة التقدم يعتمد عليها كمصدر احتياطي)`,
      });
    }
  }

  // 5) تقدم يتجاوز 100% (تلوث بيانات)
  const badProgress = await db.progress.count({
    where: { OR: [{ progressPercent: { gt: 100 } }, { progressPercent: { lt: 0 } }] },
  });
  if (badProgress > 0) {
    checks.push({
      id: "progress-out-of-range",
      severity: "ERROR",
      message: `يوجد ${badProgress} سجل تقدم بنسب خارج النطاق 0-100`,
    });
  }

  // 6) روابط بمسارات غير صالحة
  const links = await db.lessonLink.findMany();
  const badLinks = links.filter((l) => !/^https?:\/\/.+/i.test(l.url));
  for (const l of badLinks) {
    checks.push({
      id: `link-bad-${l.id}`,
      severity: "WARN",
      message: `الرابط «${l.title}» لا يبدأ بـ http/https`,
    });
  }

  const errors = checks.filter((c) => c.severity === "ERROR").length;
  const warns = checks.filter((c) => c.severity === "WARN").length;

  const result: WorkflowResult = {
    name: "video-health-check",
    status: errors > 0 ? "FAILED" : warns > 0 ? "WARNING" : "SUCCESS",
    checks:
      checks.length > 0
        ? checks
        : [{ id: "all-clean", severity: "OK", message: "كل الفحوصات سليمة — لا مشاكل" }],
    summary: `الفحص اكتمل: ${errors} أخطاء، ${warns} تحذيرات`,
    ranAt: new Date().toISOString(),
  };

  await db.workflowRun.create({
    data: {
      name: result.name,
      status: result.status,
      result: JSON.stringify(result),
    },
  });

  return result;
}

/** سجل آخر التشغيلات */
export async function getWorkflowHistory(limit = 10) {
  const runs = await db.workflowRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return runs.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    summary: (() => {
      try {
        return r.result ? (JSON.parse(r.result) as WorkflowResult).summary : null;
      } catch {
        return null;
      }
    })(),
    createdAt: r.createdAt.toISOString(),
  }));
}

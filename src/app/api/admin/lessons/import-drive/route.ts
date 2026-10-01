import { db } from "@/lib/db";
import { adminGuard, ERR, fail, logActivity, ok } from "@/lib/api-helpers";
import { extractDriveFolderId, isDriveFolderLink } from "@/lib/drive";

// ─────────────────────────────────────────────────────────────
// استيراد دروس من مجلد Google Drive عام (FR جديد: الاستيراد السريع)
// POST /api/admin/lessons/import-drive { courseId, folderUrl }
// يقرأ ملفات الفيديو داخل المجلد وينشئ درسًا لكل ملف (وضع Drive) بالترتيب الأبجدي.
// يتطلب أن يكون المجلد متاحًا لـ «أي شخص لديه الرابط».
// ─────────────────────────────────────────────────────────────

const VIDEO_EXT_RE = /\.(mp4|m4v|mov|webm|mkv|avi)$/i;
const MAX_IMPORT = 50;

type DriveEntry = { fileId: string; name: string };

/** قراءة قائمة ملفات مجلد عام عبر صفحة embeddedfolderview (بدون مفاتيح API) */
async function listFolderFiles(folderId: string): Promise<DriveEntry[]> {
  const res = await fetch(
    `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`,
    { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en" }, cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`تعذر الوصول إلى المجلد (HTTP ${res.status})`);
  }
  const html = await res.text();
  if (/accounts\.google\.com|Sign in/i.test(html.slice(0, 2000))) {
    throw new Error("المجلد غير عام — اجعل صلاحيته «أي شخص لديه الرابط» ثم أعد المحاولة");
  }

  const entries: DriveEntry[] = [];
  const chunkRe = /class="flip-entry"[\s\S]*?(?=class="flip-entry"|$)/g;
  const chunks = html.match(chunkRe) ?? [];
  for (const chunk of chunks) {
    const idMatch = chunk.match(/entry-([a-zA-Z0-9_-]{10,60})/);
    const titleMatch = chunk.match(/flip-entry-title">([^<]*)</);
    if (idMatch && titleMatch) {
      entries.push({
        fileId: idMatch[1],
        name: titleMatch[1].trim(),
      });
    }
  }
  return entries;
}

export async function POST(req: Request) {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const body = (await req.json().catch(() => null)) as
      | { courseId?: string; folderUrl?: string }
      | null;
    const courseId = String(body?.courseId ?? "").trim();
    const folderUrl = String(body?.folderUrl ?? "").trim();

    if (!courseId || !folderUrl) return fail("معرف الكورس ولينك المجلد مطلوبان", 422);
    if (!isDriveFolderLink(folderUrl))
      return fail("اللينك المُدخل ليس لينك مجلد Google Drive صحيحًا", 422);

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return ERR.notFound("الكورس");

    const folderId = extractDriveFolderId(folderUrl);
    if (!folderId) return fail("تعذر استخراج معرف المجلد من اللينك", 422);

    let entries: DriveEntry[];
    try {
      entries = await listFolderFiles(folderId);
    } catch (e) {
      return fail(e instanceof Error ? e.message : "تعذر قراءة محتويات المجلد", 422);
    }

    const videos = entries
      .filter((e) => VIDEO_EXT_RE.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, "ar", { numeric: true }));

    if (videos.length === 0)
      return fail("لم أجد أي ملفات فيديو داخل المجلد (mp4، mov، webm…)", 422);
    if (videos.length > MAX_IMPORT)
      return fail(`المجلد يحتوي ${videos.length} ملفًا — الحد الأقصى ${MAX_IMPORT} درسًا في المرة`, 422);

    const last = await db.lesson.findFirst({
      where: { courseId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });
    let order = (last?.orderIndex ?? -1) + 1;

    const existing = await db.lesson.findMany({
      where: { courseId },
      select: { driveFileId: true },
    });
    const existingIds = new Set(existing.map((l) => l.driveFileId));

    let created = 0;
    for (const v of videos) {
      if (existingIds.has(v.fileId)) continue; // تجنّب التكرار عند إعادة الاستيراد
      await db.lesson.create({
        data: {
          courseId,
          title: v.name.replace(VIDEO_EXT_RE, "") || v.name,
          orderIndex: order++,
          driveFileId: v.fileId,
          videoSource: "drive",
          status: "PUBLISHED",
        },
      });
      created += 1;
    }

    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "LESSON_IMPORT_DRIVE",
      entity: "course",
      entityId: courseId,
      detail: `استيراد ${created} درسًا من مجلد Drive إلى كورس: ${course.title}`,
    });

    return ok({ created, totalInFolder: videos.length });
  } catch (e) {
    console.error("[admin:lessons:import-drive]", e);
    return ERR.server();
  }
}

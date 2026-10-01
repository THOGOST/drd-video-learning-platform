// ─────────────────────────────────────────────────────────────
// أدوات معالجة روابط Google Drive (FR-12)
// - استخراج File ID من أي صيغة رابط شائعة
// - كشف لينكات المجلدات (لا يمكن تضمينها كفيديو)
// - تطبيع مصدر الفيديو تلقائيًا عند الحفظ (سيرفر + واجهة)
// ─────────────────────────────────────────────────────────────

export type VideoSource = "direct" | "drive";

export type NormalizedVideo = {
  videoSource: VideoSource;
  videoUrl: string | null;
  driveFileId: string | null;
  /** رسالة خطأ عربية قاطعة (مثلًا: لينك مجلد لا يمكن تشغيله) */
  error?: string;
  /** تنبيه غير قاتل (تم التحويل تلقائيًا…) */
  notice?: string;
};

const FOLDER_PATTERNS = [
  /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//i,
  /drive\.google\.com\/(?:embedded)?folderview/i,
];

const RAW_ID_RE = /^[a-zA-Z0-9_-]{10,60}$/;

/** هل المدخل ID خام سليم (وليس رابطًا)؟ */
export function isRawFileId(input: string): boolean {
  return RAW_ID_RE.test((input || "").trim());
}

/** هل النص لينك مجلد في Drive؟ المجلدات لا يمكن تضمينها كمشغل فيديو. */
export function isDriveFolderLink(input: string): boolean {
  const s = (input || "").trim();
  if (!s) return false;
  return FOLDER_PATTERNS.some((re) => re.test(s));
}

/** هل النص لينك Google Drive إطلاقًا (ملف أو مجلد أو uc)؟ */
export function isDriveLink(input: string): boolean {
  const s = (input || "").trim();
  if (!s) return false;
  return (
    /drive\.google\.com/i.test(s) ||
    /docs\.google\.com\/(uc|file)/i.test(s) ||
    isDriveFolderLink(s)
  );
}

/**
 * استخراج File ID من الصيغ الشائعة:
 * - ID خام: 14wxAZOLczcO0rAEBX28UyuVr5_tZ-PH5
 * - رابط ملف: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - رابط معاينة: https://drive.google.com/file/d/FILE_ID/preview
 * - open?id=FILE_ID  |  uc?export=download&id=FILE_ID
 */
export function extractDriveFileId(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
  if (RAW_ID_RE.test(s)) return s;
  let m = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{10,60})/i);
  if (m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]{10,60})/);
  if (m) return m[1];
  m = s.match(/docs\.google\.com\/(?:uc|file[^/]*)\/(?:d\/)?([a-zA-Z0-9_-]{10,60})/i);
  if (m) return m[1];
  m = s.match(/\/d\/([a-zA-Z0-9_-]{10,60})/);
  if (m) return m[1];
  return null;
}

/** استخراج Folder ID من لينك مجلد: drive.google.com/drive/folders/FOLDER_ID */
export function extractDriveFolderId(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
  const m = s.match(
    /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]{10,60})/i
  );
  return m ? m[1] : null;
}

/**
 * تطبيع موحّد لمدخلات مصدر الفيديو قبل الحفظ:
 * - وضع drive: يقبل File ID خام أو أي رابط ملف Drive ويستخرج المعرّف تلقائيًا.
 * - وضع direct: إن وُجد رابط Drive ملف يتحول تلقائيًا إلى وضع Drive،
 *   ولينك المجلدات يُرفض برسالة عربية واضحة.
 */
export function normalizeVideoInput(raw: {
  videoSource?: string;
  videoUrl?: string | null;
  driveFileId?: string | null;
}): NormalizedVideo {
  const source: VideoSource = raw.videoSource === "drive" ? "drive" : "direct";
  const urlField = (raw.videoUrl || "").trim();
  const driveField = (raw.driveFileId || "").trim();

  // لينك مجلد؟ مرفوض في كل الأوضاع — لا يمكن تضمين مجلد كمشغل فيديو
  const candidate = source === "drive" ? driveField || urlField : urlField;
  if (candidate && isDriveFolderLink(candidate)) {
    return {
      videoSource: source,
      videoUrl: source === "direct" ? urlField || null : null,
      driveFileId: source === "drive" ? driveField || null : null,
      error:
        "ده لينك مجلد في Google Drive مش لينك ملف فيديو — افتح المجلد وشغّل الفيديو، ثم انسخ لينك الملف نفسه (يبدأ بـ drive.google.com/file/d/…)",
    };
  }

  if (source === "drive") {
    const input = driveField || urlField;
    // لا شيء مدخل → يُسمح بالحفظ فارغًا (كما سابقًا) ليُكمل الإعداد لاحقًا
    if (!input) return { videoSource: "drive", videoUrl: null, driveFileId: null };
    const id = extractDriveFileId(input);
    if (!id) {
      return {
        videoSource: "drive",
        videoUrl: null,
        driveFileId: null,
        error:
          "لم نتمكن من استخراج معرّف الملف (File ID) — الصق معرّف الملف فقط أو رابط ملف صحيح من drive.google.com/file/d/…",
      };
    }
    return {
      videoSource: "drive",
      videoUrl: null,
      driveFileId: id,
      notice: driveField !== id ? "تم استخراج الـ File ID من الرابط تلقائيًا" : undefined,
    };
  }

  // وضع direct: هل هذا في الحقيقة رابط Drive؟ حوّله تلقائيًا
  if (urlField && isDriveLink(urlField)) {
    const id = extractDriveFileId(urlField);
    if (id) {
      return {
        videoSource: "drive",
        videoUrl: null,
        driveFileId: id,
        notice:
          "رابط Google Drive اتحوّل تلقائيًا إلى وضع Drive — سيتشغّل داخل المشغل المضمّن",
      };
    }
  }

  return { videoSource: "direct", videoUrl: urlField || null, driveFileId: null };
}

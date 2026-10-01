"use client";

// ─────────────────────────────────────────────────────────────
// مشغل الفيديو مع حفظ التقدم التلقائي (FR-06, FR-07, FR-08 + القسم 11)
// - حفظ كل 15 ثانية + عند الإيقاف + عند النهاية + عند مغادرة الصفحة
// - استكمال من آخر نقطة محفوظة تلقائيًا
// - الاكتمال عند 90% أو بزر «إتمام الدرس»
// - الوضعان للدروس من Drive:
//   1) «الجودة الأصلية»: HTML5 يشغّل الملف الأصلي عبر Drive API (alt=media)
//      — الجودة الكاملة ثابتة حتى في ملء الشاشة، وتتبع تقدم حقيقي 100%
//      (يتطلب NEXT_PUBLIC_GOOGLE_API_KEY، مع رجوع تلقائي لمشغل Drive عند الفشل)
//   2) «مشغل Drive»: iframe المدمج — الجودة تتكيف تلقائيًا حسب النت
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  CloudUpload,
  Download,
  ExternalLink,
  Info,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client";

const SAVE_INTERVAL_MS = 15_000; // حفظ كل 15 ثانية (10-20 حسب الوثيقة)
const COMPLETION_PERCENT = 90; // قاعدة الاكتمال (القسم 11)
const DRIVE_MODE_KEY = "drd-drive-player-mode"; // تفضيل المستخدم للمشغل

export type PlayerProgress = {
  lastPosition: number;
  progressPercent: number;
  completed: boolean;
};

type DriveMode = "original" | "embed";

type Props = {
  lessonId: string;
  videoSource: "direct" | "drive";
  videoUrl: string | null;
  driveFileId: string | null;
  registeredDuration: number;
  initialProgress: PlayerProgress | null;
  onProgressChange?: (p: PlayerProgress) => void;
};

function readStoredDriveMode(): DriveMode {
  if (typeof window === "undefined") return "original";
  return window.localStorage.getItem(DRIVE_MODE_KEY) === "embed"
    ? "embed"
    : "original";
}

export function VideoPlayer({
  lessonId,
  videoSource,
  videoUrl,
  driveFileId,
  registeredDuration,
  initialProgress,
  onProgressChange,
}: Props) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSentRef = useRef<{ pos: number; at: number }>({ pos: 0, at: 0 });
  const driveStartRef = useRef<number>(Date.now());
  const lastDriveSentRef = useRef<number>(0);
  const resumedRef = useRef(false);

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

  // رابط تشغيل الملف الأصلي عبر Drive API (يدعم CORS + Range → تقديم للفاصل)
  const nativeSrc =
    videoSource === "drive" && driveFileId && googleApiKey
      ? `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&key=${encodeURIComponent(
          googleApiKey
        )}`
      : null;

  const [driveMode, setDriveMode] = useState<DriveMode>(readStoredDriveMode);
  // هل عنصر <video> الأصلي معروض الآن؟ (فيديو مباشر أو Drive بجودة أصلية)
  const nativeActive =
    (videoSource === "direct" && !!videoUrl) ||
    (videoSource === "drive" && !!nativeSrc && driveMode === "original");

  const [progress, setProgress] = useState<PlayerProgress>(
    initialProgress ?? { lastPosition: 0, progressPercent: 0, completed: false }
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [resumeApplied, setResumeApplied] = useState(false);

  const initial = useRef(initialProgress);

  // إرسال التقدم للسيرفر
  const sendProgress = useCallback(
    async (pos: number, percent: number, opts?: { completed?: boolean; silent?: boolean }) => {
      const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));
      // منع التراجع: لا نرسل نقطة أقدم من المحفوظة إلا عند اكتمال
      if (
        !opts?.completed &&
        initial.current &&
        pos < initial.current.lastPosition &&
        clampedPercent < COMPLETION_PERCENT
      ) {
        return;
      }
      setSaving(true);
      try {
        const res = await api<{ progress: PlayerProgress }>("/api/progress", {
          method: "POST",
          body: JSON.stringify({
            lessonId,
            lastPosition: Math.floor(pos),
            progressPercent: clampedPercent,
            completed: opts?.completed ?? false,
          }),
        });
        initial.current = res.progress;
        setProgress(res.progress);
        setSavedAt(new Date());
        onProgressChange?.(res.progress);

        if (res.progress.completed && !initialProgress?.completed && !opts?.silent) {
          toast({
            title: "أحسنت! أتممت الدرس 🎉",
            description: "تم تحديث نسبة إنجازك في الكورس.",
          });
        }
      } catch {
        // فشل الحفظ الصامت مقبول — سيعاد المحاولة في الدورة القادمة
      } finally {
        setSaving(false);
      }
    },
    [lessonId, onProgressChange, toast, initialProgress?.completed]
  );

  // إرسال عبر sendBeacon عند مغادرة الصفحة (أحداث page leave — القسم 11)
  useEffect(() => {
    if (!nativeActive) return;
    const handler = () => {
      const v = videoRef.current;
      if (v && v.currentTime > 0 && !v.ended) {
        const percent =
          v.duration > 0 ? Math.round((v.currentTime / v.duration) * 100) : 0;
        const payload = JSON.stringify({
          lessonId,
          lastPosition: Math.floor(v.currentTime),
          progressPercent: percent,
        });
        navigator.sendBeacon?.(
          "/api/progress",
          new Blob([payload], { type: "application/json" })
        );
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [lessonId, nativeActive]);

  // عند تبديل وضع المشغل يُسمح بإعادة الاستكمال على العنصر الجديد
  useEffect(() => {
    resumedRef.current = false;
  }, [nativeActive]);

  // مؤقت وضع iframe (تقدير زمني): يعمل فقط عندما لا يوجد عنصر فيديو حقيقي
  // قاعدة أمان: عند غياب مدة الدرس المسجلة لا يتجاوز التقدير 89% —
  // أي أن الإتمام التلقائي (≥90% على السيرفر) لا يحدث إلا إذا كانت المدة معروفة.
  useEffect(() => {
    if (videoSource !== "drive" || nativeActive) return;
    driveStartRef.current = Date.now();
    lastDriveSentRef.current = Date.now();

    const driveCap = registeredDuration > 0 ? registeredDuration : 600;
    const maxEstimate = registeredDuration > 0 ? 99 : 89;

    const drivePercent = () =>
      Math.min(
        maxEstimate,
        Math.round((Math.floor((Date.now() - driveStartRef.current) / 1000) / driveCap) * 100)
      );

    const tick = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - driveStartRef.current) / 1000);
      if (Date.now() - lastDriveSentRef.current >= SAVE_INTERVAL_MS && elapsed > 3) {
        lastDriveSentRef.current = Date.now();
        void sendProgress(Math.min(elapsed, driveCap), drivePercent());
      }
    }, 5_000);

    return () => {
      window.clearInterval(tick);
      // حفظ نهائي عند مغادرة الدرس أو تبديل الوضع
      const elapsed = Math.floor((Date.now() - driveStartRef.current) / 1000);
      if (elapsed > 3) {
        void sendProgress(Math.min(elapsed, driveCap), drivePercent(), {
          silent: true,
        });
      }
    };
  }, [lessonId, videoSource, registeredDuration, nativeActive]);

  // حفظ التقدم قبل التبديل من المشغل الأصلي (حتى لا تُفقد نقطة المشاهدة)
  const saveCurrentNativePosition = useCallback(() => {
    const v = videoRef.current;
    if (v && v.duration > 0 && v.currentTime > 1 && !v.ended) {
      void sendProgress(v.currentTime, (v.currentTime / v.duration) * 100, {
        silent: true,
      });
    }
  }, [sendProgress]);

  const switchDriveMode = (next: DriveMode) => {
    if (next === driveMode) return;
    if (nativeActive) saveCurrentNativePosition();
    setDriveMode(next);
    try {
      window.localStorage.setItem(DRIVE_MODE_KEY, next);
    } catch {
      /* تجاهل قيود التخزين */
    }
  };

  // فشل تشغيل الملف الأصلي (مفتاح ناقص/ملف غير عام/حصة) → رجوع تلقائي لمشغل Drive
  const handleNativeError = () => {
    if (videoSource === "drive" && nativeSrc) {
      saveCurrentNativePosition();
      setDriveMode("embed");
      try {
        window.localStorage.setItem(DRIVE_MODE_KEY, "embed");
      } catch {
        /* تجاهل */
      }
      toast({
        title: "تم التحويل إلى مشغل Drive",
        description:
          "الجودة الأصلية غير متاحة لهذا الفيديو حاليًا (تأكد من مفتاح Google API ومن مشاركة الملف بـ«أي شخص لديه الرابط»).",
      });
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration || Number.isNaN(v.duration)) return;
    const now = Date.now();
    // حفظ دوري كل 15 ثانية
    if (now - lastSentRef.current.at >= SAVE_INTERVAL_MS && v.currentTime > 2) {
      lastSentRef.current = { pos: v.currentTime, at: now };
      const percent = Math.round((v.currentTime / v.duration) * 100);
      void sendProgress(v.currentTime, percent);
    }
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v || resumedRef.current) return;
    resumedRef.current = true;
    const start = initial.current?.lastPosition ?? 0;
    // استكمال من آخر نقطة (FR-07) بشرط أن تكون داخل نطاق منطقي
    if (start > 5 && v.duration > 0 && start < v.duration - 3) {
      v.currentTime = start;
      setResumeApplied(true);
      toast({
        title: "تم الاستكمال من آخر نقطة مشاهدة",
        description: `عند الدقيقة ${Math.floor(start / 60)}:${String(Math.floor(start % 60)).padStart(2, "0")}`,
      });
    }
  };

  const handlePause = () => {
    const v = videoRef.current;
    if (!v || v.ended || v.currentTime <= 1) return;
    const percent = v.duration > 0 ? Math.round((v.currentTime / v.duration) * 100) : 0;
    void sendProgress(v.currentTime, percent);
  };

  const handleEnded = () => {
    const v = videoRef.current;
    if (!v) return;
    void sendProgress(v.duration || v.currentTime, 100, { completed: true });
  };

  const markComplete = () => {
    const v = videoRef.current;
    const pos = nativeActive && v ? v.currentTime : progress.lastPosition;
    void sendProgress(pos, 100, { completed: true });
  };

  const driveEmbedUrl =
    videoSource === "drive" && driveFileId
      ? `https://drive.google.com/file/d/${driveFileId}/preview`
      : null;
  const driveDownloadUrl =
    videoSource === "drive" && driveFileId
      ? `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&confirm=t`
      : null;
  const driveViewUrl =
    videoSource === "drive" && driveFileId
      ? `https://drive.google.com/file/d/${driveFileId}/view`
      : null;

  const commonVideoProps = {
    ref: videoRef,
    controls: true,
    preload: "metadata" as const,
    playsInline: true,
    className: "w-full h-full",
    onTimeUpdate: handleTimeUpdate,
    onLoadedMetadata: handleLoadedMetadata,
    onPause: handlePause,
    onEnded: handleEnded,
    onPlay: () => (lastSentRef.current.at = Date.now()),
    onError: handleNativeError,
  };

  return (
    <div className="space-y-3">
      {/* شريط تحكم وضع المشغل + أدوات الجودة (دروس Drive فقط) */}
      {videoSource === "drive" && driveFileId && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {nativeSrc ? (
            <div
              className="inline-flex items-center rounded-lg border bg-card p-1 text-xs"
              role="group"
              aria-label="اختيار وضع المشغل"
            >
              <button
                type="button"
                onClick={() => switchDriveMode("original")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                  driveMode === "original"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Sparkles className="size-3.5" />
                جودة أصلية
              </button>
              <button
                type="button"
                onClick={() => switchDriveMode("embed")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                  driveMode === "embed"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Cloud className="size-3.5" />
                مشغل Drive
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3.5" />
              لتشغيل الجودة الأصلية داخل الموقع، أضف متغير NEXT_PUBLIC_GOOGLE_API_KEY
              في إعدادات Vercel ثم أعد النشر.
            </p>
          )}

          <div className="flex items-center gap-2">
            {driveDownloadUrl && (
              <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
                <a href={driveDownloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="size-3.5" />
                  تنزيل بجودة أصلية
                </a>
              </Button>
            )}
            {driveViewUrl && (
              <Button asChild size="sm" variant="ghost" className="gap-1.5 text-xs">
                <a href={driveViewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  فتح في Drive
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-border/50 shadow-lg">
        {nativeActive ? (
          <video
            {...commonVideoProps}
            key={`native-${videoSource}-${videoUrl ?? driveFileId}`}
            src={videoSource === "direct" ? (videoUrl ?? undefined) : (nativeSrc ?? undefined)}
            // crossorigin يحوّل الطلب إلى CORS mode — مطلوب لتيار Drive API
            // (طلب no-cors يُحجب بسبب cross-origin-resource-policy: same-site من جوجل)
            crossOrigin={videoSource === "drive" ? "anonymous" : undefined}
          />
        ) : driveEmbedUrl ? (
          <iframe
            src={driveEmbedUrl}
            title="مشغل Google Drive"
            allow="autoplay"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            لا يوجد مصدر فيديو متاح لهذا الدرس
          </div>
        )}
      </div>

      {/* شريط حالة التقدم أسفل الفيديو */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card/60 px-4 py-3">
        <CloudUpload
          className={`size-4 shrink-0 transition-colors ${
            saving ? "text-primary animate-pulse" : savedAt ? "text-primary" : "text-muted-foreground"
          }`}
        />
        <div className="flex-1 min-w-[140px]">
          <Progress value={progress.progressPercent} className="h-2" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
          <span>{progress.progressPercent}%</span>
          {progress.completed ? (
            <Badge variant="default" className="gap-1 text-[11px]">
              <CheckCircle2 className="size-3" /> مكتمل
            </Badge>
          ) : saving ? (
            <span>جارٍ الحفظ…</span>
          ) : savedAt ? (
            <span>حُفظ {savedAt.toLocaleTimeString("ar-EG")}</span>
          ) : (
            <span>حفظ تلقائي كل 15 ثانية</span>
          )}
        </div>

        {!progress.completed && (
          <Button size="sm" variant="outline" onClick={markComplete} className="gap-1.5">
            <CheckCircle2 className="size-4" />
            إتمام الدرس
          </Button>
        )}
      </div>

      {videoSource === "drive" && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Info className="size-4 shrink-0 mt-0.5" />
          {driveMode === "original" && nativeSrc ? (
            <p>
              تشغيل بالجودة الأصلية الكاملة للملف الذي رفعته — الجودة ثابتة ولا تتغير
              حتى في وضع ملء الشاشة، والتقدم يُحفظ بدقة (استكمال تلقائي من آخر نقطة).
              قد يستهلك بيانات أكثر من مشغل Drive المضغوط.
            </p>
          ) : (
            <p>
              هذا الدرس يُبث عبر مشغل Google Drive المدمج، والذي يغيّر الجودة تلقائيًا
              حسب سرعة الإنترنت (وهذا سبب تراجع الجودة في ملء الشاشة). استخدم زر
              «تنزيل بجودة أصلية» أو فعّل وضع «جودة أصلية» لأعلى جودة ممكنة.
            </p>
          )}
        </div>
      )}

      {resumeApplied && (
        <p className="sr-only">تم استكمال الفيديو من آخر نقطة محفوظة</p>
      )}
    </div>
  );
}

"use client";

// ─────────────────────────────────────────────────────────────
// مشغل الفيديو مع حفظ التقدم التلقائي (FR-06, FR-07, FR-08 + القسم 11)
// - حفظ كل 15 ثانية + عند الإيقاف + عند النهاية + عند مغادرة الصفحة
// - استكمال من آخر نقطة محفوظة تلقائيًا
// - الاكتمال عند 90% أو بزر «إتمام الدرس»
// - وضعان: فيديو مباشر (HTML5) أو Google Drive (iframe)
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CloudUpload, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client";

const SAVE_INTERVAL_MS = 15_000; // حفظ كل 15 ثانية (10-20 حسب الوثيقة)
const COMPLETION_PERCENT = 90; // قاعدة الاكتمال (القسم 11)

export type PlayerProgress = {
  lastPosition: number;
  progressPercent: number;
  completed: boolean;
};

type Props = {
  lessonId: string;
  videoSource: "direct" | "drive";
  videoUrl: string | null;
  driveFileId: string | null;
  registeredDuration: number;
  initialProgress: PlayerProgress | null;
  onProgressChange?: (p: PlayerProgress) => void;
};

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
    const handler = () => {
      const v = videoRef.current;
      if (videoSource === "direct" && v && v.currentTime > 0 && !v.ended) {
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
  }, [lessonId, videoSource]);

  // مؤقت وضع Google Drive: نقيس زمن البقاء في الصفحة كتقدير تقريبي
  useEffect(() => {
    if (videoSource !== "drive") return;
    driveStartRef.current = Date.now();
    lastDriveSentRef.current = Date.now();

    const tick = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - driveStartRef.current) / 1000);
      const cap = registeredDuration > 0 ? registeredDuration : 600;
      const percent = Math.min(99, Math.round((elapsed / cap) * 100));
      if (Date.now() - lastDriveSentRef.current >= SAVE_INTERVAL_MS && elapsed > 3) {
        lastDriveSentRef.current = Date.now();
        void sendProgress(Math.min(elapsed, cap), percent);
      }
    }, 5_000);

    return () => {
      window.clearInterval(tick);
      // حفظ نهائي عند مغادرة الدرس
      const elapsed = Math.floor((Date.now() - driveStartRef.current) / 1000);
      const cap = registeredDuration > 0 ? registeredDuration : 600;
      if (elapsed > 3) {
        void sendProgress(Math.min(elapsed, cap), Math.min(99, Math.round((elapsed / cap) * 100)), {
          silent: true,
        });
      }
    };
  }, [lessonId, videoSource, registeredDuration]);

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
    const pos = videoSource === "direct" && v ? v.currentTime : progress.lastPosition;
    void sendProgress(pos, 100, { completed: true });
  };

  const driveEmbedUrl =
    videoSource === "drive" && driveFileId
      ? `https://drive.google.com/file/d/${driveFileId}/preview`
      : null;

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-border/50 shadow-lg">
        {videoSource === "direct" && videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            preload="metadata"
            playsInline
            className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPause={handlePause}
            onEnded={handleEnded}
            onPlay={() => (lastSentRef.current.at = Date.now())}
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
          <p>
            هذا الدرس يُبث من Google Drive. نظرًا لقيود تضمين Drive لا يمكن قراءة نقطة
            التوقف داخل المشغل، لذا يتم تقدير التقدم من زمن المشاهدة، ويمكنك الضغط على
            «إتمام الدرس» عند الانتهاء.
          </p>
        </div>
      )}

      {resumeApplied && (
        <p className="sr-only">تم استكمال الفيديو من آخر نقطة محفوظة</p>
      )}
    </div>
  );
}

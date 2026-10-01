"use client";

// قائمة دروس الكورس مع حالة كل درس: لم يبدأ / قيد المشاهدة / مكتمل (FR-03)

import { CheckCircle2, Circle, CirclePlay, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, type CourseLesson } from "@/lib/client";
import { navigate } from "@/lib/router";

type Props = {
  lessons: CourseLesson[];
  courseSlug: string;
  activeLessonId?: string;
  isAuthenticated: boolean;
};

export function LessonList({
  lessons,
  courseSlug,
  activeLessonId,
  isAuthenticated,
}: Props) {
  return (
    <ol className="space-y-1.5" aria-label="قائمة دروس الكورس">
      {lessons.map((lesson, i) => {
        const active = lesson.id === activeLessonId;
        const target = `/courses/${courseSlug}/lessons/${lesson.id}`;

        return (
          <li key={lesson.id}>
            <button
              type="button"
              onClick={() => navigate(target)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-full text-start flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all",
                "hover:bg-accent hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring",
                active && "border-primary/60 bg-accent shadow-sm",
                lesson.status === "COMPLETED" && "bg-primary/[0.04]"
              )}
            >
              {/* مؤشر الحالة */}
              <span className="shrink-0">
                {!isAuthenticated ? (
                  <Lock className="size-4 text-muted-foreground" />
                ) : lesson.status === "COMPLETED" ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : lesson.status === "IN_PROGRESS" ? (
                  <CirclePlay className="size-5 text-primary" />
                ) : (
                  <Circle className="size-5 text-muted-foreground/50" />
                )}
              </span>

              <span className="flex-1 min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium truncate",
                    active && "text-primary",
                    lesson.status === "COMPLETED" && "text-muted-foreground"
                  )}
                >
                  {i + 1}. {lesson.title}
                </span>
                {lesson.status === "IN_PROGRESS" && lesson.progress && (
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    وصلت إلى {lesson.progress.progressPercent}%
                  </span>
                )}
              </span>

              <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                {formatDuration(lesson.duration)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

"use client";

// تفاصيل الكورس: غلاف + نسبة الإنجاز + قائمة الدروس بحالتها (FR-03) + زر متابعة

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  PlayCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LessonList } from "@/components/lesson-list";
import { api, useAuth, type CourseLesson } from "@/lib/client";
import { buildPath, navigate } from "@/lib/router";

type CourseDetailResponse = {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    status: string;
  };
  lessons: CourseLesson[];
  percent: number;
  completedCount: number;
  continueLessonId: string | null;
};

export function CourseDetailsView({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => api<CourseDetailResponse>(`/api/courses/${encodeURIComponent(slug)}`),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center space-y-3">
        <p className="text-lg font-bold">الكورس غير موجود</p>
        <Button variant="outline" onClick={() => navigate(buildPath.courses())}>
          العودة إلى الكورسات
        </Button>
      </div>
    );
  }

  const { course, lessons, percent, completedCount, continueLessonId } = data;
  const totalMinutes = Math.round(lessons.reduce((s, l) => s + l.duration, 0) / 60);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* رأس الكورس */}
      <div className="relative rounded-2xl overflow-hidden border">
        <div className="absolute inset-0">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={`غلاف كورس ${course.title}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/25 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        </div>

        <div className="relative p-6 md:p-8 pt-28 md:pt-40 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="size-3" /> {lessons.length} دروس
            </Badge>
            {totalMinutes > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Clock3 className="size-3" /> ~{totalMinutes} دقيقة
              </Badge>
            )}
            {user && percent === 100 && lessons.length > 0 && (
              <Badge className="gap-1">
                <CheckCircle2 className="size-3" /> أكملت الكورس
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold">{course.title}</h1>
          {course.description && (
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              {course.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1">
            {user ? (
              <>
                <div className="min-w-[220px] flex-1 max-w-sm space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      أنجزت {completedCount} من {lessons.length} دروس
                    </span>
                    <span className="font-bold text-primary">{percent}%</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
                {continueLessonId && (
                  <Button
                    className="gap-2"
                    onClick={() =>
                      navigate(
                        buildPath.lesson(course.slug, continueLessonId)
                      )
                    }
                  >
                    <PlayCircle className="size-5" />
                    {percent > 0 ? "متابعة التعلم" : "ابدأ الكورس"}
                  </Button>
                )}
              </>
            ) : (
              <Button className="gap-2" onClick={() => navigate(buildPath.login())}>
                <GraduationCap className="size-5" />
                سجّل الدخول لبدء المشاهدة
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* قائمة الدروس */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">محتوى الكورس</CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              لم تُضف دروس لهذا الكورس بعد.
            </p>
          ) : (
            <LessonList
              lessons={lessons}
              courseSlug={course.slug}
              isAuthenticated={Boolean(user)}
            />
          )}
        </CardContent>
      </Card>

      <div>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(buildPath.courses())}>
          <ArrowLeft className="size-4" />
          كل الكورسات
        </Button>
      </div>
    </div>
  );
}

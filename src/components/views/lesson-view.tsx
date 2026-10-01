"use client";

// صفحة الدرس: الفيديو + العنوان + الوصف + الروابط + حالة الإنجاز (FR-04, FR-05)
// «الجزء الأهم في تجربة المستخدم هو صفحة الدرس التي تجمع الفيديو والوصف
//  والروابط وحالة التقدم في مكان واحد» — القسم 22 من الوثيقة

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderGit2,
  HelpCircle,
  Link2,
  ListVideo,
  Loader2,
  Lock,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoPlayer, type PlayerProgress } from "@/components/video-player";
import { LessonQuiz } from "@/components/lesson-quiz";
import { LessonList } from "@/components/lesson-list";
import { api, formatDuration, useAuth, ApiError } from "@/lib/client";
import { buildPath, navigate } from "@/lib/router";

type LessonResponse = {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    duration: number;
    driveFileId: string | null;
    videoUrl: string | null;
    videoSource: "direct" | "drive";
    orderIndex: number;
  };
  course: { id: string; title: string; slug: string };
  links: { id: string; title: string; url: string; type: string }[];
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  quiz: { enabled: boolean; passed: boolean };
  progress: PlayerProgress | null;
};

const LINK_ICONS: Record<string, typeof Link2> = {
  link: Link2,
  file: FileText,
  github: FolderGit2,
  doc: FileText,
};

export function LessonView({ slug, lessonId }: { slug: string; lessonId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api<LessonResponse>(`/api/lessons/${lessonId}`),
    enabled: Boolean(user), // الحماية على السيرفر أيضًا (FR-13)
    retry: (count, err) => !(err instanceof ApiError && err.status === 423) && count < 1,
  });

  const handleProgressChange = (p: PlayerProgress) => {
    queryClient.setQueryData<LessonResponse>(["lesson", lessonId], (old) =>
      old ? { ...old, progress: p } : old
    );
    if (p.completed) {
      void queryClient.invalidateQueries({ queryKey: ["course", slug] });
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  };

  if (!user) return null; // سيتم التحويل لصفحة الدخول من الهيكل

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        <div className="aspect-video rounded-xl bg-muted animate-pulse" />
        <div className="h-6 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    // درس مقفول: الدرس السابق فيه اختبار لم يُجتز (423 من السيرفر)
    if (error instanceof ApiError && error.status === 423) {
      return (
        <div className="mx-auto max-w-5xl px-4 py-20 text-center space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <Lock className="size-8" />
          </div>
          <p className="text-lg font-bold">الدرس مقفول 🔒</p>
          <p className="text-muted-foreground max-w-md mx-auto">
            {error.message}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => navigate(buildPath.course(slug))}>
              قائمة الدروس
            </Button>
            <Button
              onClick={() => {
                const prevId =
                  typeof error.data?.prevLessonId === "string"
                    ? error.data.prevLessonId
                    : undefined;
                navigate(prevId ? buildPath.lesson(slug, prevId) : buildPath.course(slug));
              }}
              className="gap-1.5"
            >
              <HelpCircle className="size-4" />
              اذهب للاختبار
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center space-y-3">
        <p className="text-lg font-bold">الدرس غير موجود أو غير منشور</p>
        <Button variant="outline" onClick={() => navigate(buildPath.courses())}>
          العودة إلى الكورسات
        </Button>
      </div>
    );
  }

  const { lesson, course, links, prev, next, progress } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
      {/* مسار التنقل */}
      <nav
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="مسار التنقل"
      >
        <button className="hover:text-foreground" onClick={() => navigate(buildPath.home())}>
          الرئيسية
        </button>
        <span>/</span>
        <button className="hover:text-foreground" onClick={() => navigate(buildPath.courses())}>
          الكورسات
        </button>
        <span>/</span>
        <button
          className="hover:text-foreground truncate max-w-[200px]"
          onClick={() => navigate(buildPath.course(course.slug))}
        >
          {course.title}
        </button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        {/* العمود الرئيسي */}
        <div className="space-y-4 min-w-0">
          {/* المدة الحقيقية فقط — lastPosition موضع مشاهدة وليست مدة، واستخدامه كان يسبب إكمالًا زائفًا */}
          <VideoPlayer
            key={lesson.id}
            lessonId={lesson.id}
            videoSource={lesson.videoSource}
            videoUrl={lesson.videoUrl}
            driveFileId={lesson.driveFileId}
            registeredDuration={lesson.duration || 0}
            initialProgress={progress}
            onProgressChange={handleProgressChange}
          />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                الدرس {lesson.orderIndex + 1}
              </Badge>
              {lesson.duration > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="size-3 hidden" />
                  {formatDuration(lesson.duration)}
                </Badge>
              )}
              {data.quiz.enabled && (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1",
                    data.quiz.passed
                      ? "text-green-600 border-green-600/40"
                      : "text-amber-600 border-amber-600/40"
                  )}
                >
                  {data.quiz.passed ? (
                    <>
                      <Trophy className="size-3" /> الاختبار: مجتاز
                    </>
                  ) : (
                    <>
                      <HelpCircle className="size-3" /> يوجد اختبار
                    </>
                  )}
                </Badge>
              )}
              {progress?.completed && (
                <Badge className="gap-1">
                  <CheckCircle2 className="size-3" /> مكتمل
                </Badge>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-extrabold">{lesson.title}</h1>

            <Tabs defaultValue="description">
              <TabsList>
                <TabsTrigger value="description">الشرح</TabsTrigger>
                <TabsTrigger value="links" className="gap-1.5">
                  <Link2 className="size-3.5" />
                  روابط وملفات
                  {links.length > 0 && (
                    <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5">
                      {links.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description">
                <Card>
                  <CardContent className="p-5">
                    {lesson.description ? (
                      <p className="text-sm leading-loose whitespace-pre-line text-foreground/90">
                        {lesson.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        لا يوجد شرح مكتوب لهذا الدرس بعد.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="links">
                <Card>
                  <CardContent className="p-4">
                    {links.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        لا توجد روابط أو ملفات مرفقة بهذا الدرس.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {links.map((link) => {
                          const Icon = LINK_ICONS[link.type] ?? Link2;
                          return (
                            <li key={link.id}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent hover:border-primary/40 group"
                              >
                                <span className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary shrink-0">
                                  <Icon className="size-4" />
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-sm font-medium truncate">
                                    {link.title}
                                  </span>
                                  <span className="block text-xs text-muted-foreground truncate">
                                    {link.url}
                                  </span>
                                </span>
                                <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary shrink-0" />
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* اختبار الدرس — يفتح الدرس التالي عند الاجتياز */}
          {data.quiz.enabled && (
            <LessonQuiz
              lessonId={lesson.id}
              onPassed={() => {
                void queryClient.invalidateQueries({ queryKey: ["course", slug] });
              }}
            />
          )}

          {/* السابق / التالي */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {prev ? (
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => navigate(buildPath.lesson(course.slug, prev.id))}
              >
                <ArrowRight className="size-4" />
                <span className="truncate">{prev.title}</span>
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button
                variant="outline"
                className="justify-end gap-2 col-start-2"
                onClick={() => navigate(buildPath.lesson(course.slug, next.id))}
              >
                <span className="truncate">{next.title}</span>
                <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <span />
            )}
          </div>
        </div>

        {/* القائمة الجانبية للدروس */}
        <Card className="lg:sticky lg:top-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListVideo className="size-4 text-primary" />
              دروس {course.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LessonListQuery courseSlug={course.slug} activeLessonId={lesson.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LessonListQuery({ courseSlug, activeLessonId }: { courseSlug: string; activeLessonId: string }) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["course", courseSlug],
    queryFn: () =>
      api<{
        lessons: {
          id: string;
          title: string;
          orderIndex: number;
          duration: number;
          progress: PlayerProgress | null;
          status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
        }[];
        percent: number;
        completedCount: number;
      }>(`/api/courses/${encodeURIComponent(courseSlug)}`),
      enabled: Boolean(user),
  });

  if (!data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-primary" />
        {data.completedCount} من {data.lessons.length} مكتمل
      </div>
      <Separator />
      <LessonList
        lessons={data.lessons}
        courseSlug={courseSlug}
        activeLessonId={activeLessonId}
        isAuthenticated
      />
    </div>
  );
}



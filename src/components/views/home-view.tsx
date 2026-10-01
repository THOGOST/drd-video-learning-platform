"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Clock3,
  Gauge,
  GraduationCap,
  ListVideo,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CourseCard } from "@/components/course-card";
import { CourseGridSkeleton } from "@/components/course-grid-skeleton";
import {
  AnimatedCounter,
  FadeIn,
  FloatingBlobs,
  HoverLift,
  Stagger,
  StaggerItem,
} from "@/components/motion/animated";
import { api, useAuth, type CourseListItem } from "@/lib/client";
import { buildPath, navigate } from "@/lib/router";

const FEATURES = [
  {
    icon: PlayCircle,
    title: "دروس بالفيديو منظمة",
    text: "كورسات مقسمة إلى دروس مرتبة، كل درس بصفحة خاصة تجمع الفيديو والوصف والروابط.",
  },
  {
    icon: RotateCcw,
    title: "استكمال من حيث توقفت",
    text: "يُحفظ موضع المشاهدة تلقائيًا كل 15 ثانية، وعند العودة يكمل الفيديو من نفس النقطة.",
  },
  {
    icon: Gauge,
    title: "نسبة إنجاز دقيقة",
    text: "شريط تقدم لكل كورس يُحسب من الدروس المكتملة، مع تمييز واضح لكل درس أنهيته.",
  },
  {
    icon: ShieldCheck,
    title: "حماية المحتوى",
    text: "التحقق من الصلاحيات على السيرفر لكل درس، والفيديوهات مخزنة على Google Drive.",
  },
];

export function HomeView() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api<{ courses: CourseListItem[] }>("/api/courses"),
  });

  // شريط «أكمل من حيث توقفت» — بيانات اللوحة للمسجلين فقط
  const { data: dash } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      api<{
        continueWatching: {
          lessonId: string;
          lessonTitle: string;
          courseTitle: string;
          courseSlug: string;
          percent: number;
        } | null;
      }>("/api/dashboard"),
    enabled: Boolean(user),
  });
  const continueWatching = dash?.continueWatching ?? null;

  const courses = data?.courses ?? [];

  return (
    <div>
      {/* البطل Hero */}
      <section className="hero-gradient border-b relative overflow-hidden">
        <FloatingBlobs />
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24 text-center space-y-6 relative">
          <FadeIn>
            <Badge variant="outline" className="mx-auto gap-1.5 px-3 py-1 text-primary border-primary/40">
              <Sparkles className="size-3.5" />
              منصة تعليمية بالفيديو مع تتبع تلقائي للتقدم
            </Badge>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.25] max-w-3xl mx-auto">
              تعلّم بالفيديو،
              <span className="text-primary"> وأكمل من حيث توقفت</span> في أي وقت
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed md:text-lg">
              استعرض الكورسات، شاهد دروسك المرتبة، واحفظ تقدمك تلقائيًا أثناء المشاهدة —
              بدون أي تدخل يدوي. كل ما تحتاجه لتتبع رحلتك التعليمية في مكان واحد.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button size="lg" className="gap-2" onClick={() => navigate(buildPath.courses())}>
                <ListVideo className="size-5" />
                استعرض الكورسات
              </Button>
              {!user && (
                <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate(buildPath.register())}>
                  <GraduationCap className="size-5" />
                  أنشئ حسابك مجانًا
                </Button>
              )}
              {user && (
                <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate(buildPath.dashboard())}>
                  <Gauge className="size-5" />
                  متابعة تعلمي
                </Button>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* شريط أكمل من حيث توقفت */}
      {user && continueWatching && (
        <section className="mx-auto max-w-7xl px-4 -mt-6 relative z-10">
          <FadeIn>
            <Card className="border-primary/30 bg-gradient-to-l from-primary/10 via-card to-card shadow-lg">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="hidden sm:flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                  <PlayCircle className="size-6" />
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-medium text-primary">أكمل من حيث توقفت ▸</p>
                  <p className="font-bold truncate">{continueWatching.lessonTitle}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    في كورس: {continueWatching.courseTitle}
                  </p>
                  <div className="flex items-center gap-2 pt-1 max-w-md">
                    <Progress value={continueWatching.percent} className="h-1.5" />
                    <span className="text-[11px] font-semibold text-primary shrink-0">
                      {continueWatching.percent}%
                    </span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="gap-2 w-full sm:w-auto shrink-0"
                  onClick={() =>
                    navigate(
                      buildPath.lesson(continueWatching.courseSlug, continueWatching.lessonId)
                    )
                  }
                >
                  <PlayCircle className="size-5" />
                  استكمال المشاهدة
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        </section>
      )}

      {/* المميزات */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <HoverLift className="h-full">
                <Card className="border-border/60 h-full">
                  <CardContent className="p-5 space-y-2.5">
                    <span className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
                      <f.icon className="size-5" />
                    </span>
                    <h3 className="font-bold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
                  </CardContent>
                </Card>
              </HoverLift>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* الكورسات */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold">الكورسات المتاحة</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user
                ? "تقدمك محفوظ تلقائيًا داخل كل كورس."
                : "سجّل الدخول ليبدأ حفظ تقدمك داخل الكورسات."}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(buildPath.courses())} className="gap-1">
            عرض الكل
          </Button>
        </div>

        {isLoading ? (
          <CourseGridSkeleton count={4} />
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground space-y-2">
              <BookOpen className="size-10 mx-auto opacity-40" />
              <p>لا توجد كورسات منشورة بعد — يرجى العودة قريبًا.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {courses.slice(0, 8).map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>

      {/* شريط ثقة */}
      <section className="border-t bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-3 gap-4 text-center">
          <FadeIn className="space-y-1">
            <p className="text-2xl font-extrabold text-primary">
              <AnimatedCounter value={courses.length} />
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <ListVideo className="size-3.5" /> كورس منشور
            </p>
          </FadeIn>
          <FadeIn delay={0.1} className="space-y-1">
            <p className="text-2xl font-extrabold text-primary">
              <AnimatedCounter value={courses.reduce((s, c) => s + c.lessonsCount, 0)} />
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock3 className="size-3.5" /> درس بالفيديو
            </p>
          </FadeIn>
          <FadeIn delay={0.2} className="space-y-1">
            <p className="text-2xl font-extrabold text-primary">
              <AnimatedCounter value={100} suffix="%" />
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="size-3.5" /> حفظ تلقائي للتقدم
            </p>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}

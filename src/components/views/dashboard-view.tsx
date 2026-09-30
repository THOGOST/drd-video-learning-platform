"use client";

// لوحة المستخدم: الكورسات التي بدأها + نسب الإنجاز + آخر درس (User Dashboard)

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Gauge,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api, formatDate, useAuth } from "@/lib/client";
import { buildPath, navigate } from "@/lib/router";

type DashboardResponse = {
  stats: {
    coursesCount: number;
    totalLessons: number;
    totalCompleted: number;
    overallPercent: number;
    watchedMinutes: number;
    lastActivityAt: string | null;
  };
  courses: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    lessonsCount: number;
    completedCount: number;
    percent: number;
    continueLesson: {
      id: string;
      title: string;
      lastPosition: number;
      percent: number;
    } | null;
    enrolledAt: string;
  }[];
};

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <span className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xl font-extrabold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardResponse>("/api/dashboard"),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const { stats, courses } = data;
  const activeCourses = courses.filter((c) => c.percent < 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold">
          أهلًا، {user?.name?.split(" ")[0] ?? "بك"} 👋
        </h1>
        <p className="text-muted-foreground">
          {activeCourses.length > 0
            ? `لديك ${activeCourses.length} كورس جارٍ — أكمل من حيث توقفت.`
            : courses.length > 0
              ? "أكملت كل كورساتك! استعرض كورسات جديدة."
              : "لم تبدأ أي كورس بعد — استعرض الكورسات وابدأ رحلتك."}
        </p>
      </header>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="كورس مسجَّل به" value={stats.coursesCount} />
        <StatCard
          icon={CheckCircle2}
          label="درس مكتمل"
          value={`${stats.totalCompleted}/${stats.totalLessons}`}
        />
        <StatCard
          icon={TrendingUp}
          label="نسبة الإنجاز الكلية"
          value={`${stats.overallPercent}%`}
        />
        <StatCard
          icon={Clock3}
          label="دقائق مشاهدة"
          value={stats.watchedMinutes}
        />
      </div>

      {/* الكورسات */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">كورساتي</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate(buildPath.courses())}>
            استعرض كورسات جديدة
          </Button>
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <Sparkles className="size-10 mx-auto text-primary/60" />
              <p className="font-medium">ابدأ أول كورس لك اليوم</p>
              <p className="text-sm text-muted-foreground">
                افتح أي كورس وشاهد أول درس — سيُسجَّل تقدمك تلقائيًا هنا.
              </p>
              <Button className="mt-2" onClick={() => navigate(buildPath.courses())}>
                استعرض الكورسات
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {courses.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-center">
                  <button
                    type="button"
                    className="w-full md:w-44 aspect-video rounded-lg overflow-hidden bg-muted shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => navigate(buildPath.course(c.slug))}
                    aria-label={`فتح كورس ${c.title}`}
                  >
                    {c.thumbnail ? (
                      <img
                        src={c.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="font-bold text-start hover:text-primary transition-colors truncate"
                        onClick={() => navigate(buildPath.course(c.slug))}
                      >
                        {c.title}
                      </button>
                      <span className="font-extrabold text-primary shrink-0">
                        {c.percent}%
                      </span>
                    </div>
                    <Progress value={c.percent} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {c.completedCount} من {c.lessonsCount} دروس — مسجَّل منذ{" "}
                      {formatDate(c.enrolledAt)}
                    </p>

                    {c.continueLesson && c.percent < 100 && (
                      <div className="flex items-center gap-3 pt-1">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() =>
                            navigate(buildPath.lesson(c.slug, c.continueLesson!.id))
                          }
                        >
                          <PlayCircle className="size-4" />
                          {c.percent > 0 ? "متابعة" : "ابدأ"}: {c.continueLesson.title}
                        </Button>
                        {c.continueLesson.percent > 0 && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            وصلت إلى {c.continueLesson.percent}% من هذا الدرس
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

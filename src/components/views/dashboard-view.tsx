"use client";

// لوحة المستخدم «لوحتي» — إحصاءات متحركة + حلقة تقدم + نشاط أسبوعي + إنجازات
// (User Dashboard)

import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  Medal,
  PlayCircle,
  Rocket,
  Sparkles,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverLift, Stagger, StaggerItem } from "@/components/motion/animated";
import {
  AnimatedCounter,
  FadeIn,
  FloatingBlobs,
  ProgressRing,
} from "@/components/motion/animated";
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
  weeklyActivity: { day: string; label: string; completed: number; minutes: number }[];
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
  suffix,
  delay = 0,
}: {
  icon: typeof Gauge;
  label: string;
  value: number;
  suffix?: string;
  delay?: number;
}) {
  return (
    <StaggerItem>
      <HoverLift className="h-full">
        <Card className="h-full">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary shrink-0">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold leading-none">
                <AnimatedCounter value={value} suffix={suffix} />
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
            </div>
          </CardContent>
        </Card>
      </HoverLift>
    </StaggerItem>
  );
}

// ─── الإنجازات: شارات تُفتح حسب الإحصاءات ───
function buildAchievements(stats: DashboardResponse["stats"], activeCourses: number) {
  return [
    { icon: Rocket, label: "بداية الرحلة", desc: "التحاق بأول كورس", unlocked: stats.coursesCount >= 1 },
    { icon: Medal, label: "أول إنجاز", desc: "إكمال أول درس", unlocked: stats.totalCompleted >= 1 },
    { icon: Flame, label: "شغف متزايد", desc: "إكمال 5 دروس", unlocked: stats.totalCompleted >= 5 },
    { icon: Clock3, label: "ساعة تعلم", desc: "60 دقيقة مشاهدة", unlocked: stats.watchedMinutes >= 60 },
    { icon: Award, label: "متواصل", desc: "3 كورسات نشطة", unlocked: activeCourses >= 3 },
    { icon: Trophy, label: "بطل المنصة", desc: "إكمال كورس كامل", unlocked: stats.overallPercent >= 100 || stats.coursesCount > 0 && stats.totalCompleted >= stats.totalLessons && stats.totalLessons > 0 },
  ];
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

  const { stats, weeklyActivity, courses } = data;
  const activeCourses = courses.filter((c) => c.percent < 100);
  const achievements = buildAchievements(stats, activeCourses.length);
  const maxMinutes = Math.max(...weeklyActivity.map((d) => d.minutes), 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      {/* ترحيب + حلقة التقدم */}
      <FadeIn>
        <section className="hero-gradient border rounded-2xl relative overflow-hidden">
          <FloatingBlobs />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 space-y-2 text-center md:text-start">
              <h1 className="text-3xl font-extrabold">
                أهلًا، {user?.name?.split(" ")[0] ?? "بك"} 👋
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {activeCourses.length > 0
                  ? `لديك ${activeCourses.length} كورس جارٍ — أكمل من حيث توقفت.`
                  : courses.length > 0
                    ? "أكملت كل كورساتك! استعرض كورسات جديدة."
                    : "لم تبدأ أي كورس بعد — استعرض الكورسات وابدأ رحلتك."}
              </p>
              {stats.lastActivityAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center md:justify-start">
                  <Sparkles className="size-3.5 text-primary" />
                  آخر نشاط: {formatDate(stats.lastActivityAt)}
                </p>
              )}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                <Button className="gap-1.5" onClick={() => navigate(buildPath.courses())}>
                  <BookOpen className="size-4" />
                  استعرض الكورسات
                </Button>
                {activeCourses[0]?.continueLesson && (
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      navigate(
                        buildPath.lesson(
                          activeCourses[0].slug,
                          activeCourses[0].continueLesson!.id
                        )
                      )
                    }
                  >
                    <PlayCircle className="size-4" />
                    متابعة التعلم
                  </Button>
                )}
              </div>
            </div>
            <div className="shrink-0 bg-background/70 backdrop-blur rounded-2xl p-4 border shadow-sm">
              <ProgressRing
                value={stats.overallPercent}
                size={140}
                sublabel="إنجازك الكلي"
              />
            </div>
          </div>
        </section>
      </FadeIn>

      {/* بطاقات الإحصاء */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="كورس مسجَّل به" value={stats.coursesCount} />
        <StatCard
          icon={CheckCircle2}
          label="درس مكتمل"
          value={stats.totalCompleted}
          suffix={`/${stats.totalLessons}`}
          delay={0.1}
        />
        <StatCard
          icon={TrendingUp}
          label="نسبة الإنجاز الكلية"
          value={stats.overallPercent}
          suffix="%"
          delay={0.2}
        />
        <StatCard
          icon={Clock3}
          label="دقائق مشاهدة"
          value={stats.watchedMinutes}
          delay={0.3}
        />
      </Stagger>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* النشاط الأسبوعي */}
        <FadeIn className="lg:col-span-3">
          <Card className="h-full">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold">نشاطك هذا الأسبوع</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    دقائق المشاهدة والدروس المكتملة خلال آخر 7 أيام
                  </p>
                </div>
                <span className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="size-4" />
                </span>
              </div>
              <div dir="ltr" className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivity} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      width={30}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                        direction: "rtl",
                      }}
                      formatter={(value: number | string, name: string) =>
                        name === "minutes"
                          ? [`${value} دقيقة`, "مشاهدة"]
                          : [`${value} درس`, "مكتمل"]
                      }
                    />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="minutes" />
                    <Bar dataKey="completed" fill="hsl(var(--primary) / 0.35)" radius={[6, 6, 0, 0]} name="completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-primary" /> دقائق المشاهدة
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-primary/35" /> دروس مكتملة
                </span>
                <span className="ms-auto">
                  الذروة: {Math.max(...weeklyActivity.map((d) => d.minutes), 0)} دقيقة
                  من {maxMinutes && weeklyActivity.length ? "" : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* الإنجازات */}
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold">إنجازاتك</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {achievements.filter((a) => a.unlocked).length} من {achievements.length} شارة مفتوحة
                  </p>
                </div>
                <span className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
                  <Award className="size-4" />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {achievements.map((a) => (
                  <div
                    key={a.label}
                    title={`${a.label} — ${a.desc}`}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                      a.unlocked
                        ? "bg-primary/5 border-primary/30"
                        : "opacity-40 grayscale"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center size-9 rounded-full ${
                        a.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <a.icon className="size-4" />
                    </span>
                    <p className="text-[11px] font-semibold leading-tight">{a.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{a.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* الكورسات */}
      <FadeIn>
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
            <Stagger className="space-y-4">
              {courses.map((c) => (
                <StaggerItem key={c.id}>
                  <HoverLift>
                    <Card className="overflow-hidden">
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
                          {c.percent >= 100 && (
                            <div className="flex items-center gap-1.5 text-xs text-primary font-semibold pt-1">
                              <Trophy className="size-4" />
                              أكملت هذا الكورس بالكامل — أحسنت!
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </HoverLift>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>
      </FadeIn>
    </div>
  );
}

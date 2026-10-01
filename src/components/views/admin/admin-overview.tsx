"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ListVideo,
  TrendingUp,
  Users2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, formatDateTime } from "@/lib/client";

type StatsResponse = {
  stats: {
    users: number;
    courses: number;
    lessons: number;
    enrollments: number;
    completedLessons: number;
  };
  topCourses: { title: string; enrollments: number }[];
  activity: {
    id: string;
    actorName: string | null;
    action: string;
    detail: string | null;
    level: string;
    createdAt: string;
  }[];
};

const LEVEL_COLORS: Record<string, string> = {
  INFO: "text-primary",
  WARN: "text-amber-500",
  ERROR: "text-destructive",
};

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users2;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <span className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-2xl font-extrabold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api<StatsResponse>("/api/admin/stats"),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { stats, topCourses, activity } = data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat icon={Users2} label="مستخدم" value={stats.users} />
        <Stat icon={BookOpen} label="كورس" value={stats.courses} />
        <Stat icon={ListVideo} label="درس بالفيديو" value={stats.lessons} />
        <Stat icon={GraduationCap} label="تسجيل في الكورسات" value={stats.enrollments} />
        <Stat
          icon={CheckCircle2}
          label="درس أتمّه الطلاب"
          value={stats.completedLessons}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* الأكثر تسجيلًا */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              الأكثر تسجيلًا للطلاب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                لا توجد تسجيلات بعد.
              </p>
            ) : (
              topCourses.map((c, i) => (
                <div
                  key={c.title}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <span className="flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{c.title}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {c.enrollments} مسجَّل
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* سجل النشاط */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              آخر النشاطات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 max-h-80 overflow-y-auto pe-1">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 text-sm"
                >
                  <span
                    className={`mt-1.5 size-1.5 rounded-full shrink-0 ${
                      a.level === "ERROR"
                        ? "bg-destructive"
                        : a.level === "WARN"
                          ? "bg-amber-500"
                          : "bg-primary"
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{a.detail ?? a.action}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {a.actorName ?? "النظام"} — {formatDateTime(a.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
              {activity.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  لا نشاطات بعد.
                </p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

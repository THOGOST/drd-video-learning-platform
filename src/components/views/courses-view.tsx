"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCard } from "@/components/course-card";
import { CourseGridSkeleton } from "@/components/course-grid-skeleton";
import { api, useAuth, type CourseListItem } from "@/lib/client";

export function CoursesView() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api<{ courses: CourseListItem[] }>("/api/courses"),
  });

  const courses = data?.courses ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold">كل الكورسات</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          {user
            ? "كل كورس يظهر عليه شريط تقدمك الخاص — يُحدَّث تلقائيًا مع كل درس تشاهده."
            : "تصفح الكورسات المتاحة، وسجّل الدخول لبدء حفظ تقدمك أثناء المشاهدة."}
        </p>
      </header>

      {isLoading ? (
        <CourseGridSkeleton count={4} />
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground space-y-3">
            <BookOpen className="size-12 mx-auto opacity-40" />
            <p className="font-medium">لا توجد كورسات منشورة حاليًا</p>
            <p className="text-sm">يمكن للمدير إضافة كورسات من لوحة الإدارة.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}

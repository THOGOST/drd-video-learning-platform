"use client";

import { BookOpen, CheckCircle2, GraduationCap, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type CourseListItem } from "@/lib/client";
import { buildPath, navigate } from "@/lib/router";

type Props = {
  course: CourseListItem;
  href?: string;
};

export function CourseCard({ course, href }: Props) {
  const target = href ?? buildPath.course(course.slug);
  const progress = course.progress;

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`كورس: ${course.title}`}
      className="group cursor-pointer overflow-hidden pt-0 gap-0 transition-all hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => navigate(target)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(target);
        }
      }}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={`غلاف كورس ${course.title}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <GraduationCap className="size-12 text-primary/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <Badge className="absolute top-3 start-3 gap-1 bg-black/60 backdrop-blur text-white border-white/20">
          <BookOpen className="size-3" />
          {course.lessonsCount} دروس
        </Badge>
        {progress && progress.percent === 100 && (
          <Badge className="absolute bottom-3 end-3 gap-1 bg-primary text-primary-foreground">
            <CheckCircle2 className="size-3" /> مكتمل
          </Badge>
        )}
        <div className="absolute bottom-3 start-3 end-3 flex items-center gap-2 text-white">
          <PlayCircle className="size-5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        )}

        {progress ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {progress.completed} من {course.lessonsCount} دروس
              </span>
              <span className="font-semibold text-primary">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-1.5" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pt-1">
            {course.lessonsCount > 0
              ? `ابدأ رحلة التعلم — ${course.lessonsCount} درسًا بالفيديو`
              : "قريبًا — قيد الإعداد"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

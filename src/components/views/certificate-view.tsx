"use client";

// شهادة إتمام الكورس (FR جديد): صفحة أنيقة قابلة للطباعة/حفظ PDF
// تتحقق من إتمام الكورس 100% على السيرفر وتعرض كود تحقق ثابت.

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Award, BadgeCheck, CalendarDays, GraduationCap, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError, formatDate, useAuth } from "@/lib/client";
import { buildPath, navigate } from "@/lib/router";

type CertificateResponse = {
  studentName: string;
  courseTitle: string;
  lessonsCount: number;
  issuedAt: string;
  code: string;
};

export function CertificateView({ slug }: { slug: string }) {
  const { user, loading } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["certificate", slug],
    queryFn: () => api<CertificateResponse>(`/api/certificate/${encodeURIComponent(slug)}`),
    enabled: Boolean(user),
  });

  // احتفال مرة واحدة عند ظهور الشهادة
  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(() => {
      void confetti({
        particleCount: 160,
        spread: 75,
        origin: { y: 0.4 },
        colors: ["#d4a017", "#f5c451", "#ffffff"],
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (loading) return null;
  if (!user && !loading) {
    navigate(buildPath.login(buildPath.certificate(slug).slice(1)));
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        جارٍ التحقق من إتمام الكورس…
      </div>
    );
  }

  if (isError || !data) {
    const locked = error instanceof ApiError && error.status === 403;
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Award className="size-8" />
        </div>
        <p className="text-lg font-bold">{locked ? "الشهادة لم تُتاح بعد" : "الشهادة غير متاحة"}</p>
        <p className="text-muted-foreground max-w-md mx-auto">
          {error instanceof Error ? error.message : "حدث خطأ غير متوقع."}
        </p>
        <Button variant="outline" onClick={() => navigate(buildPath.course(slug))}>
          العودة إلى الكورس
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6 print:py-0">
      {/* شريط أدوات (يختفي عند الطباعة) */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold">شهادتك جاهزة! 🎓</h1>
          <p className="text-sm text-muted-foreground mt-1">
            اطبعها أو احفظها PDF من زر الطباعة — الشهادة موقّعة بكود تحقق فريد.
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-1.5">
          <Printer className="size-4" />
          طباعة / حفظ PDF
        </Button>
      </div>

      {/* ورقة الشهادة */}
      <div
        dir="rtl"
        className="relative rounded-2xl border-[6px] border-double border-[#c9a227] bg-white text-[#1c1917] shadow-xl overflow-hidden print:rounded-none print:border-[4px] print:shadow-none"
      >
        {/* زخرفة علوية */}
        <div className="h-2.5 bg-gradient-to-l from-[#c9a227] via-[#f0d77b] to-[#c9a227]" />

        <div className="px-6 sm:px-12 py-10 sm:py-14 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#c9a227]/15 text-[#c9a227]">
              <GraduationCap className="size-8" />
            </span>
            <div className="text-start">
              <p className="text-xl font-extrabold">منصة درس</p>
              <p className="text-xs text-[#78716c]">DRD Video Learning Platform</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-lg sm:text-xl text-[#57534e]">شهادة إتمام</p>
            <Award className="size-10 mx-auto text-[#c9a227]" />
            <p className="text-sm text-[#57534e]">تُشهد منصة درس بأن</p>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#1c1917]">
              {data.studentName}
            </p>
            <p className="text-sm text-[#57534e]">قد أتمّ بنجاح كامل متطلبات كورس</p>
            <p className="text-2xl font-bold text-[#b8860b] max-w-xl mx-auto leading-snug">
              {data.courseTitle}
            </p>
            <p className="text-sm text-[#57534e]">
              بواقع {data.lessonsCount} درسًا تعليميًا بالفيديو
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 pt-2 text-xs text-[#57534e]">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              تاريخ الإصدار: {formatDate(data.issuedAt)}
            </span>
            <span className="flex items-center gap-1.5" dir="ltr">
              <BadgeCheck className="size-4" />
              كود التحقق: <span className="font-mono font-semibold text-[#1c1917]">{data.code}</span>
            </span>
          </div>
        </div>

        <div className="h-2.5 bg-gradient-to-l from-[#c9a227] via-[#f0d77b] to-[#c9a227]" />
      </div>

      {/* ملاحظة تحقق (تختفي عند الطباعة) */}
      <p className="text-xs text-muted-foreground text-center print:hidden">
        يمكن لأي شخص التحقق من صحة الشهادة بمطابقة كود التحقق مع سجلات المنصة.
      </p>
    </div>
  );
}

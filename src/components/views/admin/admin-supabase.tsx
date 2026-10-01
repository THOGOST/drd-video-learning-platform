"use client";

// قسم قاعدة البيانات في لوحة الإدارة — حالة ربط Supabase + دليل التهيئة + ملفات SQL

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Database,
  ExternalLink,
  FileCode2,
  KeyRound,
  Link2,
  Loader2,
  PlugZap,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn, HoverLift } from "@/components/motion/animated";
import { api } from "@/lib/client";

type SupabaseStatus = {
  configured: boolean;
  connection: "ok" | "failed" | "not_configured";
  projectHost: string;
  url: string;
  anonKey: string;
  serviceKey: boolean;
  dbUrl: boolean;
  localDbOk: boolean;
  files: { schema: string; seed: string; guide: string };
};

const ENV_VARS = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", desc: "رابط المشروع من Settings → API" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", desc: "المفتاح العام (anon) للواجهة" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", desc: "مفتاح الخدمة للعمليات الخلفية (اختياري)" },
  { key: "SUPABASE_DB_URL", desc: "رابط PostgreSQL الخاص بقاعدة Supabase" },
];

export function AdminSupabase() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["supabase", "status"],
    queryFn: () => api<SupabaseStatus>("/api/supabase/status"),
  });

  const connectionBadge =
    data?.connection === "ok" ? (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" variant="outline">
        <CheckCircle2 className="size-3" /> متصل
      </Badge>
    ) : data?.connection === "failed" ? (
      <Badge className="gap-1 bg-destructive/15 text-destructive border-destructive/30" variant="outline">
        <XCircle className="size-3" /> فشل الاتصال
      </Badge>
    ) : (
      <Badge className="gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" variant="outline">
        <PlugZap className="size-3" /> غير مهيأ بعد
      </Badge>
    );

  return (
    <div className="space-y-5">
      {/* حالة الاتصال */}
      <FadeIn>
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary">
                  <Database className="size-5" />
                </span>
                <div>
                  <h2 className="font-bold">ربط Supabase</h2>
                  <p className="text-xs text-muted-foreground">
                    {data?.configured
                      ? `المشروع: ${data.projectHost || "—"}`
                      : "أضف متغيرات البيئة لتشغيل الربط تلقائيًا"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {connectionBadge}
                <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isRefetching}>
                  {isRefetching ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  فحص الاتصال
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">متغيرات البيئة</p>
                <p className="font-bold flex items-center gap-1.5">
                  {data?.configured ? (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-500" /> مضبوطة
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-amber-500" /> ناقصة
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">مفتاح الخدمة</p>
                <p className="font-bold">{data?.serviceKey ? "موجود" : "غير موجود"}</p>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">رابط DB</p>
                <p className="font-bold">{data?.dbUrl ? "موجود" : "غير موجود"}</p>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">قاعدة البيانات الحالية</p>
                <p className="font-bold flex items-center gap-1.5">
                  {data?.localDbOk ? (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-500" /> تعمل
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-destructive" /> متوقفة
                    </>
                  )}
                </p>
              </div>
            </div>

            {data?.url && (
              <p dir="ltr" className="text-[11px] text-muted-foreground font-mono bg-muted/50 rounded-md px-3 py-2">
                SUPABASE_URL = {data.url} · ANON_KEY = {data.anonKey}
              </p>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* متغيرات البيئة المطلوبة */}
      <FadeIn delay={0.05}>
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              <h3 className="font-bold">متغيرات البيئة المطلوبة</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              انسخ القيم من لوحة Supabase (Project Settings → API) وضعها في ملف
              <code dir="ltr" className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">.env</code>
              ثم أعد تشغيل التطبيق — سيكتشف الربط تلقائيًا.
            </p>
            <div className="rounded-xl border overflow-hidden">
              {ENV_VARS.map((v, i) => (
                <div
                  key={v.key}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-2.5 text-sm ${i % 2 ? "bg-muted/30" : ""}`}
                >
                  <code dir="ltr" className="font-mono text-xs font-bold text-primary">{v.key}</code>
                  <span className="text-xs text-muted-foreground">{v.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* ملفات SQL */}
      <FadeIn delay={0.1}>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: FileCode2,
              title: "supabase/schema.sql",
              desc: "سكربت إنشاء كل الجداول (users, courses, lessons, lesson_links, progress, course_enrollments, activity_logs) مع الفهارس والقيود — شغّله أولًا في SQL Editor.",
              badge: "البنية",
            },
            {
              icon: FileCode2,
              title: "supabase/seed.sql",
              desc: "بيانات جاهزة للتجربة: حساب مدير وطالب + 4 كورسات + 14 درسًا + روابط + سجلات تقدم — شغّله بعد الـ Schema مباشرة.",
              badge: "بيانات",
            },
            {
              icon: ExternalLink,
              title: "supabase/README.md",
              desc: "دليل خطوة بخطوة: إنشاء المشروع، تشغيل السكربتات، تحويل Prisma إلى PostgreSQL، والانتقال الكامل إلى Supabase.",
              badge: "دليل",
            },
          ].map((f) => (
            <HoverLift key={f.title} className="h-full">
              <Card className="h-full">
                <CardContent className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
                      <f.icon className="size-4" />
                    </span>
                    <Badge variant="secondary" className="text-[10px]">{f.badge}</Badge>
                  </div>
                  <p dir="ltr" className="font-mono text-xs font-bold text-start">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed text-start">{f.desc}</p>
                </CardContent>
              </Card>
            </HoverLift>
          ))}
        </div>
      </FadeIn>

      {/* خطوات سريعة */}
      <FadeIn delay={0.15}>
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" />
              <h3 className="font-bold">خطوات الربط السريعة</h3>
            </div>
            <ol className="space-y-2.5 text-sm">
              {[
                "أنشئ مشروعًا جديدًا على supabase.com وانتظر تهيئة PostgreSQL.",
                "افتح SQL Editor والصق محتوى supabase/schema.sql ثم Run.",
                "الصق محتوى supabase/seed.sql ثم Run — ستُنشأ بيانات تجريبية كاملة.",
                "انسخ URL و anon key إلى .env ثم أعد التشغيل وتحقق من الحالة أعلاه.",
                "للانتقال الكامل: غيّر provider في prisma/schema.prisma إلى postgresql واستخدم SUPABASE_DB_URL.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <div className="pt-1">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => window.open("https://supabase.com/dashboard", "_blank", "noopener")}
              >
                <ExternalLink className="size-3.5" />
                فتح لوحة Supabase
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {isLoading && <Skeleton className="h-40 rounded-xl" />}
    </div>
  );
}

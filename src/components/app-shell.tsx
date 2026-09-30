"use client";

// الهيكل الرئيسي للتطبيق — يبدّل بين الصفحات داخليًا وفق الموجّه (القسم 13)

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { HomeView } from "@/components/views/home-view";
import { CoursesView } from "@/components/views/courses-view";
import { CourseDetailsView } from "@/components/views/course-details-view";
import { LessonView } from "@/components/views/lesson-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { LoginView } from "@/components/views/login-view";
import { RegisterView } from "@/components/views/register-view";
import { AdminView } from "@/components/views/admin-view";
import { useAuth } from "@/lib/client";
import { navigate, useRoute } from "@/lib/router";

function Footer() {
  return (
    <footer className="mt-auto border-t bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="size-4" />
          </span>
          <span className="font-semibold text-foreground">منصة درس</span>
          <span className="text-xs">— DRD Video Learning Platform</span>
        </div>
        <p className="text-xs">
          Next.js + TypeScript + Prisma + Google Drive — وفق مستند المتطلبات DRD
        </p>
      </div>
    </footer>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppShell() {
  const route = useRoute();
  const { user, loading, fetchMe } = useAuth();

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  // حماية الصفحات التي تتطلب تسجيل دخول (FR-13)
  useEffect(() => {
    if (loading) return;
    const needsAuth =
      (route.view === "dashboard") ||
      (route.view === "lesson") ||
      (route.view === "admin");
    if (needsAuth && !user) {
      const redirect =
        route.view === "lesson"
          ? encodeURIComponent(window.location.hash.slice(1))
          : undefined;
      navigate(redirect ? `/login/${redirect}` : "/login");
    }
  }, [route, user, loading]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Navbar />
      <main className="flex-1">
        {loading ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="size-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin border-[3px]" />
              <p className="text-sm">جارٍ التحميل…</p>
            </div>
          </div>
        ) : route.view === "home" ? (
          <HomeView />
        ) : route.view === "courses" ? (
          <CoursesView />
        ) : route.view === "course" ? (
          <CourseDetailsView slug={route.slug} />
        ) : route.view === "lesson" ? (
          <LessonView slug={route.slug} lessonId={route.lessonId} />
        ) : route.view === "dashboard" ? (
          <DashboardView />
        ) : route.view === "login" ? (
          <LoginView redirect={route.redirect} />
        ) : route.view === "register" ? (
          <RegisterView redirect={route.redirect} />
        ) : route.view === "admin" ? (
          user?.role === "ADMIN" ? (
            <AdminView tab={route.tab} />
          ) : (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
              <div className="text-center space-y-2">
                <p className="text-lg font-bold">غير مصرح</p>
                <p className="text-sm text-muted-foreground">
                  هذه الصفحة مخصصة لمديري المنصة فقط.
                </p>
              </div>
            </div>
          )
        ) : (
          <HomeView />
        )}
      </main>
      <Footer />
    </div>
    </QueryClientProvider>
  );
}

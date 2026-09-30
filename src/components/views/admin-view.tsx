"use client";

// لوحة الإدارة — صفحة مخصصة بتخطيط جانبي (Sidebar)
// الأقسام: نظرة عامة / الكورسات / الدروس / المستخدمون والصلاحيات / قاعدة البيانات / Workflow

import { motion } from "framer-motion";
import {
  Database,
  LayoutDashboard,
  ListVideo,
  ShieldCheck,
  Workflow,
  BookOpen,
  Users2,
  Crown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buildPath, navigate } from "@/lib/router";
import { useAuth } from "@/lib/client";
import { AdminOverview } from "@/components/views/admin/admin-overview";
import { AdminCourses } from "@/components/views/admin/admin-courses";
import { AdminLessons } from "@/components/views/admin/admin-lessons";
import { AdminUsers } from "@/components/views/admin/admin-users";
import { AdminSupabase } from "@/components/views/admin/admin-supabase";
import { AdminWorkflow } from "@/components/views/admin/admin-workflow";

const TABS = [
  { key: "overview", label: "نظرة عامة", icon: LayoutDashboard, desc: "إحصائيات المنصة وسجل النشاط" },
  { key: "courses", label: "رفع الكورسات", icon: BookOpen, desc: "إضافة وتعديل الكورسات وإدارتها" },
  { key: "lessons", label: "الدروس والفيديو", icon: ListVideo, desc: "الدروس ومصادر الفيديو والروابط" },
  { key: "users", label: "المستخدمون والصلاحيات", icon: Users2, desc: "الأدوار والتفعيل والصلاحيات" },
  { key: "supabase", label: "قاعدة البيانات", icon: Database, desc: "ربط Supabase وسكربتات SQL" },
  { key: "workflow", label: "Workflow", icon: Workflow, desc: "فحص صحة النظام وسجل التشغيلات" },
];

export function AdminView({ tab }: { tab?: string }) {
  const active = TABS.some((t) => t.key === tab) ? tab! : "overview";
  const current = TABS.find((t) => t.key === active)!;
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* رأس الصفحة */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold">لوحة تحكم الإدارة</h1>
            <Badge className="gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" variant="outline">
              <Crown className="size-3" />
              ADMIN
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{current.desc}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {user?.name?.slice(0, 2) ?? "AD"}
          </span>
          <span>{user?.name}</span>
          <ShieldCheck className="size-4 text-primary" />
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* القائمة الجانبية — ديسكتوب */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden lg:block shrink-0 w-60"
        >
          <nav className="sticky top-20 space-y-1 rounded-2xl border bg-card p-2">
            {TABS.map((t) => {
              const isActive = t.key === active;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => navigate(buildPath.admin(t.key))}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="admin-nav-active"
                      className="absolute inset-0 rounded-xl bg-primary"
                      transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                    />
                  )}
                  <t.icon className="relative z-10 size-4 shrink-0" />
                  <span className="relative z-10 font-medium">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </motion.aside>

        {/* تبويبات أفقية — موبايل */}
        <div className="lg:hidden overflow-x-auto -mx-4 px-4 pb-1">
          <div className="flex gap-2 w-max">
            {TABS.map((t) => {
              const isActive = t.key === active;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => navigate(buildPath.admin(t.key))}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground"
                  }`}
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* المحتوى */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {active === "overview" && <AdminOverview />}
            {active === "courses" && <AdminCourses />}
            {active === "lessons" && <AdminLessons />}
            {active === "users" && <AdminUsers />}
            {active === "supabase" && <AdminSupabase />}
            {active === "workflow" && <AdminWorkflow />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

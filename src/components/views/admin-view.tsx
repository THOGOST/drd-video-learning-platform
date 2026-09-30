"use client";

// لوحة الإدارة — تبويبات: نظرة عامة / الكورسات / الدروس / المستخدمون / Workflow
// (Admin Dashboard — القسم 14 من الوثيقة)

import { LayoutDashboard, ListVideo, Workflow, BookOpen, Users2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildPath, navigate } from "@/lib/router";
import { AdminOverview } from "@/components/views/admin/admin-overview";
import { AdminCourses } from "@/components/views/admin/admin-courses";
import { AdminLessons } from "@/components/views/admin/admin-lessons";
import { AdminUsers } from "@/components/views/admin/admin-users";
import { AdminWorkflow } from "@/components/views/admin/admin-workflow";

const TABS = [
  { key: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { key: "courses", label: "الكورسات", icon: BookOpen },
  { key: "lessons", label: "الدروس", icon: ListVideo },
  { key: "users", label: "المستخدمون", icon: Users2 },
  { key: "workflow", label: "Workflow", icon: Workflow },
];

export function AdminView({ tab }: { tab?: string }) {
  const active = TABS.some((t) => t.key === tab) ? tab! : "overview";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold">لوحة الإدارة</h1>
        <p className="text-sm text-muted-foreground">
          إدارة الكورسات والدروس والروابط والمستخدمين ومتابعة الإحصائيات.
        </p>
      </header>

      <Tabs value={active} onValueChange={(v) => navigate(buildPath.admin(v))}>
        <TabsList className="h-auto flex-wrap justify-start w-full sm:w-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
              <t.icon className="size-4" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {active === "overview" && <AdminOverview />}
      {active === "courses" && <AdminCourses />}
      {active === "lessons" && <AdminLessons />}
      {active === "users" && <AdminUsers />}
      {active === "workflow" && <AdminWorkflow />}
    </div>
  );
}

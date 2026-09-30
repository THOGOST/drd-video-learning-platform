"use client";

// ─────────────────────────────────────────────────────────────
// عميل Supabase — التهيئة الديناميكية من متغيرات البيئة
// التطبيق يعمل حاليًا بـ SQLite عبر Prisma، وهذا العميل جاهز
// للتفعيل بمجرد إضافة متغيرات البيئة (انظر supabase/README.md)
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** هل تم ضبط متغيرات الربط؟ */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let cachedClient: SupabaseClient | null = null;

/**
 * عميل Supabase جاهز للاستخدام من المتصفح.
 * يعيد null إن لم تُضبط متغيرات البيئة (بدل أن ينهار التطبيق).
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cachedClient) return cachedClient;
  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cachedClient;
}

/** أسماء الجداول في Supabase (مطابقة لملف supabase/schema.sql) */
export const supabaseTables = {
  users: "users",
  courses: "courses",
  lessons: "lessons",
  lessonLinks: "lesson_links",
  progress: "progress",
  courseEnrollments: "course_enrollments",
  activityLogs: "activity_logs",
} as const;

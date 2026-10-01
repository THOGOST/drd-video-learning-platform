"use client";

// ─────────────────────────────────────────────────────────────
// عميل API + الأنواع المشتركة + مخزن المصادقة (Zustand)
// ─────────────────────────────────────────────────────────────

import { create } from "zustand";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type LessonProgress = {
  lastPosition: number;
  progressPercent: number;
  completed: boolean;
  updatedAt?: string;
};

export type CourseListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  lessonsCount: number;
  progress: { completed: number; percent: number } | null;
};

export type CourseLesson = {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  duration: number;
  progress: LessonProgress | null;
  status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
  locked?: boolean;
};

export type LessonLinkItem = {
  id: string;
  title: string;
  url: string;
  type: string;
};

export class ApiError extends Error {
  status: number;
  /** بيانات إضافية من السيرفر (مثل prevLessonId عند قفل الدرس) */
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || "حدث خطأ غير متوقع", res.status, data);
  }
  return data as T;
}

// ─── مخزن المصادقة ───
type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  fetchMe: async () => {
    try {
      const { user } = await api<{ user: AuthUser | null }>("/api/auth/me");
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  login: async (email, password) => {
    const { user } = await api<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    set({ user });
    return user;
  },
  register: async (name, email, password) => {
    const { user } = await api<{ user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    set({ user });
    return user;
  },
  logout: async () => {
    await api("/api/auth/logout", { method: "POST" });
    set({ user: null });
  },
}));

// ─── تنسيق الوقت ───
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")} د` : `${s} ث`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

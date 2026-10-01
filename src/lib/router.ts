"use client";

// ─────────────────────────────────────────────────────────────
// موجّه داخلي (Hash Router) — يحاكي هيكل صفحات الوثيقة (القسم 13)
// داخل مسار واحد: #/courses/[slug]/lessons/[lessonId] ...
// ─────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react";

export type Route =
  | { view: "home" }
  | { view: "courses" }
  | { view: "course"; slug: string }
  | { view: "lesson"; slug: string; lessonId: string }
  | { view: "certificate"; slug: string }
  | { view: "dashboard" }
  | { view: "login"; redirect?: string }
  | { view: "register"; redirect?: string }
  | { view: "admin"; tab?: string };

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "").replace(/^\/+|\/+$/g, "") || "";
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0) return { view: "home" };

  switch (parts[0]) {
    case "courses":
      if (parts[1] && parts[2] === "lessons" && parts[3])
        return { view: "lesson", slug: parts[1], lessonId: parts[3] };
      if (parts[1]) return { view: "course", slug: parts[1] };
      return { view: "courses" };
    case "certificate":
      if (parts[1]) return { view: "certificate", slug: parts[1] };
      return { view: "courses" };
    case "dashboard":
      return { view: "dashboard" };
    case "login":
      return { view: "login", redirect: parts[1] };
    case "register":
      return { view: "register", redirect: parts[1] };
    case "admin":
      return { view: "admin", tab: parts[1] };
    default:
      return { view: "home" };
  }
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("hashchange", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("hashchange", cb);
  };
}

function getSnapshot(): string {
  return typeof window !== "undefined" ? window.location.hash : "#/";
}

export function navigate(path: string) {
  const target = path.startsWith("#") ? path : `#${path.startsWith("/") ? path : `/${path}`}`;
  if (window.location.hash !== target) {
    window.location.hash = target;
  }
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => "#/");
  return parseHash(hash);
}

/** بناء روابط دروس/كورسات بشكل موحد */
export const buildPath = {
  home: () => "/",
  courses: () => "/courses",
  course: (slug: string) => `/courses/${encodeURIComponent(slug)}`,
  lesson: (slug: string, lessonId: string) =>
    `/courses/${encodeURIComponent(slug)}/lessons/${lessonId}`,
  certificate: (slug: string) => `/certificate/${encodeURIComponent(slug)}`,
  dashboard: () => "/dashboard",
  login: (redirect?: string) => (redirect ? `/login/${redirect}` : "/login"),
  register: (redirect?: string) => (redirect ? `/register/${redirect}` : "/register"),
  admin: (tab?: string) => (tab ? `/admin/${tab}` : "/admin"),
};

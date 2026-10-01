"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Settings2,
  Sun,
  UserPlus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/client";
import { buildPath, navigate } from "@/lib/router";

export function Navbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-2.5 sm:px-4 h-16 flex items-center gap-1.5 sm:gap-3">
        {/* الشعار */}
        <button
          type="button"
          onClick={() => navigate(buildPath.home())}
          className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-1 py-0.5"
          aria-label="الصفحة الرئيسية"
        >
          <span className="flex items-center justify-center size-9 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-5" />
          </span>
          <span className="leading-tight text-start whitespace-nowrap">
            <span className="block font-extrabold text-sm sm:text-lg">منصة درس</span>
            <span className="hidden sm:block text-[10px] text-muted-foreground font-medium">
              DRD Video Learning
            </span>
          </span>
        </button>

        <nav className="flex items-center gap-0.5 sm:gap-1 me-auto min-w-0" aria-label="التنقل الرئيسي">
          <Button variant="ghost" size="sm" className="px-2 sm:px-4 shrink-0" onClick={() => navigate(buildPath.courses())}>
            الكورسات
          </Button>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(buildPath.dashboard())}
              className="gap-1.5 px-2 sm:px-4"
              aria-label="لوحتي"
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">لوحتي</span>
            </Button>
          )}
          {user?.role === "ADMIN" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(buildPath.admin())}
              className="gap-1.5 text-primary hover:text-primary px-2 sm:px-4"
              aria-label="الإدارة"
            >
              <Settings2 className="size-4" />
              <span className="hidden sm:inline">الإدارة</span>
            </Button>
          )}
        </nav>

        {/* تبديل الثيم — يعرض أيقونة الشمس في الداكن والقمر في الفاتح (CSS فقط) */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 sm:size-9"
          aria-label="تبديل المظهر"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 sm:size-5 hidden dark:block" />
          <Moon className="size-4 sm:size-5 dark:hidden" />
        </Button>

        {/* المستخدم */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="قائمة المستخدم"
              >
                <Avatar className="size-9 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {user.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(buildPath.dashboard())}>
                <LayoutDashboard className="size-4 me-2" /> لوحة تعلمي
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                  navigate(buildPath.home());
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-4 me-2" /> تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(buildPath.login())}
              className="gap-1.5 px-2 sm:px-4"
              aria-label="دخول"
            >
              <LogIn className="size-4" />
              <span className="hidden sm:inline">دخول</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(buildPath.register())}
              className="gap-1.5 px-2.5 text-xs sm:text-sm sm:px-3"
            >
              <UserPlus className="size-4" />
              حساب جديد
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

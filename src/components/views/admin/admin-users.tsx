"use client";

// إدارة المستخدمين والصلاحيات: بحث + تغيير الدور + تفعيل/تعطيل + مرجع الصلاحيات
// (القسم 14 من الوثيقة)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Crown,
  Eye,
  ListVideo,
  Lock,
  Search,
  ShieldCheck,
  UserCog,
  Users2,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Stagger, StaggerItem, HoverLift, AnimatedCounter } from "@/components/motion/animated";
import { api, formatDate, useAuth } from "@/lib/client";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  enrollments: number;
  progressRecords: number;
  createdAt: string;
};

// مرجع الصلاحيات المعروض للإدارة
const PERMISSIONS = [
  { icon: Eye, admin: true, student: true, label: "استعرض الكورسات والدروس" },
  { icon: ListVideo, admin: true, student: true, label: "مشاهدة الفيديو وحفظ التقدم" },
  { icon: Video, admin: true, student: false, label: "رفع الكورسات والدروس وإدارة الفيديو" },
  { icon: Users2, admin: true, student: false, label: "إدارة المستخدمين والأدوار والتفعيل" },
  { icon: Crown, admin: true, student: false, label: "الوصول الكامل للوحة الإدارة والإحصائيات" },
  { icon: Lock, admin: false, student: false, label: "الزوار: التصفح فقط بدون حفظ تقدم" },
];

export function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api<{ users: AdminUser[]; total: number }>("/api/admin/users"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; role?: string; isActive?: boolean }) =>
      api("/api/admin/users", { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast({ title: "تم تحديث المستخدم" });
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const users = data?.users ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchQ =
        !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "admins" && u.role === "ADMIN") ||
        (roleFilter === "students" && u.role === "STUDENT") ||
        (roleFilter === "disabled" && !u.isActive);
      return matchQ && matchRole;
    });
  }, [users, search, roleFilter]);

  const adminsCount = users.filter((u) => u.role === "ADMIN").length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-5">
      {/* ملخص سريع */}
      <Stagger className="grid grid-cols-3 gap-3">
        {[
          { icon: Users2, label: "إجمالي المستخدمين", value: data?.total ?? 0 },
          { icon: Crown, label: "المدراء", value: adminsCount },
          { icon: ShieldCheck, label: "حسابات مفعلة", value: activeCount },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <HoverLift className="h-full">
              <Card className="h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary shrink-0">
                    <s.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xl font-extrabold leading-none">
                      <AnimatedCounter value={s.value} />
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </HoverLift>
          </StaggerItem>
        ))}
      </Stagger>

      {/* أدوات البحث والتصفية */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو البريد…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            aria-label="بحث في المستخدمين"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44" aria-label="تصفية حسب الدور">
            <SelectValue placeholder="كل الأدوار" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المستخدمين</SelectItem>
            <SelectItem value="admins">المدراء فقط</SelectItem>
            <SelectItem value="students">الطلاب فقط</SelectItem>
            <SelectItem value="disabled">المعطلين فقط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* جدول المستخدمين */}
      <div className="rounded-xl border bg-card max-h-[540px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>المستخدم</TableHead>
              <TableHead className="hidden md:table-cell">الكورسات</TableHead>
              <TableHead className="hidden md:table-cell">سجلات التقدم</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead className="hidden lg:table-cell">انضم</TableHead>
              <TableHead className="text-center">مفعل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <div className="h-8 bg-muted rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  {users.length === 0 ? "لا مستخدمين بعد." : "لا نتائج مطابقة للبحث."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <TableRow key={u.id} className={u.isActive ? "" : "opacity-60"}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {u.name.slice(0, 2)}
                        </span>
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-1.5">
                            {u.name}
                            {isSelf && (
                              <Badge variant="outline" className="text-[10px] px-1">
                                أنت
                              </Badge>
                            )}
                          </p>
                          <p dir="ltr" className="text-[11px] text-muted-foreground text-end">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{u.enrollments}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.progressRecords}
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge className="gap-1">
                          <ShieldCheck className="size-3" /> مدير
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-7 text-xs"
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              id: u.id,
                              role: u.role === "ADMIN" ? "STUDENT" : "ADMIN",
                            })
                          }
                        >
                          <UserCog className="size-3" />
                          {u.role === "ADMIN" ? "مدير → طالب" : "طالب → مدير"}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={u.isActive} disabled={isSelf}
                        aria-label={`تفعيل حساب ${u.name}`}
                        onCheckedChange={(v) => updateMutation.mutate({ id: u.id, isActive: v })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* مرجع الصلاحيات */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h3 className="font-bold">مرجع الصلاحيات</h3>
          </div>
          <div className="grid gap-2">
            {PERMISSIONS.map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <p.icon className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{p.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={
                      p.admin
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    مدير: {p.admin ? "نعم" : "لا"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      p.student
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    طالب: {p.student ? "نعم" : "لا"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            جميع الصلاحيات محمية على السيرفر (FR-13) — لا يمكن تجاوزها من المتصفح.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

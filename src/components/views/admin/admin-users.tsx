"use client";

// إدارة المستخدمين: عرض + تغيير الدور + تفعيل/تعطيل (القسم 14: إدارة المستخدمين والصلاحيات)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {data?.total ?? 0} مستخدم — يمكنك تغيير الأدوار وتعطيل الحسابات المخالفة.
      </p>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
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
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  لا مستخدمين بعد.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
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
                      <Switch
                        checked={u.isActive}
                        disabled={isSelf}
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
    </div>
  );
}

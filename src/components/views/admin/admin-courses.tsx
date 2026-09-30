"use client";

// إدارة الكورسات: إضافة / تعديل / حذف / تفعيل وتعطيل (FR-10)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, formatDate } from "@/lib/client";

type AdminCourse = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  status: string;
  lessonsCount: number;
  enrollmentsCount: number;
  createdAt: string;
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  status: string;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  description: "",
  thumbnail: "",
  status: "PUBLISHED",
};

export function AdminCourses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => api<{ courses: AdminCourse[] }>("/api/admin/courses"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleting, setDeleting] = useState<AdminCourse | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    void queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: FormState & { id?: string }) =>
      payload.id
        ? api("/api/admin/courses", {
            method: "PATCH",
            body: JSON.stringify({ ...payload, id: payload.id }),
          })
        : api("/api/admin/courses", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast({ title: editing ? "تم تحديث الكورس" : "تمت إضافة الكورس" });
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const toggleStatus = useMutation({
    mutationFn: (c: AdminCourse) =>
      api("/api/admin/courses", {
        method: "PATCH",
        body: JSON.stringify({
          id: c.id,
          status: c.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
        }),
      }),
    onSuccess: () => {
      toast({ title: "تم تغيير حالة الكورس" });
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/admin/courses?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "تم حذف الكورس وكل دروسه" });
      setDeleting(null);
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: AdminCourse) => {
    setEditing(c);
    setForm({
      title: c.title,
      slug: c.slug,
      description: c.description ?? "",
      thumbnail: c.thumbnail ?? "",
      status: c.status,
    });
    setDialogOpen(true);
  };

  const courses = data?.courses ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{courses.length} كورس</p>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" /> كورس جديد
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الكورس</TableHead>
              <TableHead className="hidden md:table-cell">الدروس</TableHead>
              <TableHead className="hidden md:table-cell">المسجلون</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="hidden lg:table-cell">أُضيف</TableHead>
              <TableHead className="text-end">إجراءات</TableHead>
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
            ) : courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  لا كورسات — أضف أول كورس الآن.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-semibold">{c.title}</p>
                    <p dir="ltr" className="text-[11px] text-muted-foreground text-end">
                      /{c.slug}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{c.lessonsCount}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {c.enrollmentsCount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === "PUBLISHED"
                          ? "default"
                          : c.status === "DRAFT"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {c.status === "PUBLISHED"
                        ? "منشور"
                        : c.status === "DRAFT"
                          ? "مسودة"
                          : "مؤرشف"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={c.status === "PUBLISHED" ? "تعطيل" : "تفعيل"}
                        onClick={() => toggleStatus.mutate(c)}
                      >
                        {c.status === "PUBLISHED" ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="تعديل"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="حذف"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* حوار الإضافة/التعديل */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الكورس" : "كورس جديد"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ ...form, id: editing?.id });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="c-title">العنوان *</Label>
              <Input
                id="c-title"
                required
                minLength={3}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-slug">الرابط اللطيف (slug)</Label>
              <Input
                id="c-slug"
                dir="ltr"
                placeholder="javascript-basics"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                اتركه فارغًا ليُولَّد تلقائيًا.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-desc">الوصف</Label>
              <Textarea
                id="c-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-thumb">رابط صورة الغلاف</Label>
              <Input
                id="c-thumb"
                dir="ltr"
                placeholder="https://…"
                value={form.thumbnail}
                onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-status">الحالة</Label>
              <select
                id="c-status"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="PUBLISHED">منشور</option>
                <option value="DRAFT">مسودة</option>
                <option value="ARCHIVED">مؤرشف</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="gap-1.5">
                {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكورس؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleting?.title}» وكل دروسه وروابطه وسجلات التقدم المرتبطة به.
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

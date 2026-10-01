"use client";

// إدارة الدروس: إضافة/تعديل/حذف/ترتيب + ربط فيديو Google Drive أو مباشر + إدارة الروابط
// (FR-10, FR-11, FR-12 + القسم 14 من الوثيقة)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FolderGit2,
  HardDriveDownload,
  Link2,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, formatDuration } from "@/lib/client";
import { normalizeVideoInput } from "@/lib/drive";

type AdminCourseLite = { id: string; title: string; status: string };
type AdminLesson = {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  duration: number;
  driveFileId: string | null;
  videoUrl: string | null;
  videoSource: string;
  status: string;
  linksCount: number;
  watchersCount: number;
};
type LinkItem = { id: string; title: string; url: string; type: string };

type LessonForm = {
  title: string;
  description: string;
  duration: string;
  videoSource: "direct" | "drive";
  videoUrl: string;
  driveFileId: string;
  status: string;
};

const emptyLesson: LessonForm = {
  title: "",
  description: "",
  duration: "",
  videoSource: "direct",
  videoUrl: "",
  driveFileId: "",
  status: "PUBLISHED",
};

export function AdminLessons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: coursesData } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => api<{ courses: AdminCourseLite[] }>("/api/admin/courses"),
  });
  const courses = coursesData?.courses ?? [];

  const [courseId, setCourseId] = useState<string>("");
  const activeCourseId = courseId || courses[0]?.id || "";

  const { data: lessonsData, isLoading } = useQuery({
    queryKey: ["admin", "lessons", activeCourseId],
    queryFn: () => api<{ lessons: AdminLesson[] }>(`/api/admin/lessons?courseId=${activeCourseId}`),
    enabled: Boolean(activeCourseId),
  });
  const lessons = lessonsData?.lessons ?? [];

  // ─── حوار الدرس ───
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLesson | null>(null);
  const [form, setForm] = useState<LessonForm>(emptyLesson);
  const [deleting, setDeleting] = useState<AdminLesson | null>(null);

  // ─── حوار الروابط ───
  const [linksLesson, setLinksLesson] = useState<AdminLesson | null>(null);

  const invalidateLessons = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "lessons", activeCourseId] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    void queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: LessonForm & { id?: string }) => {
      const body = {
        ...payload,
        courseId: activeCourseId,
        duration: parseInt(payload.duration, 10) || 0,
        id: payload.id,
      };
      return payload.id
        ? api("/api/admin/lessons", { method: "PATCH", body: JSON.stringify(body) })
        : api("/api/admin/lessons", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      toast({ title: editing ? "تم تحديث الدرس" : "تمت إضافة الدرس" });
      setDialogOpen(false);
      invalidateLessons();
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/lessons?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "تم حذف الدرس" });
      setDeleting(null);
      invalidateLessons();
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, orderIndex }: { id: string; orderIndex: number }) =>
      api("/api/admin/lessons", {
        method: "PATCH",
        body: JSON.stringify({ id, orderIndex }),
      }),
    onSuccess: () => invalidateLessons(),
  });

  const move = (index: number, dir: -1 | 1) => {
    const target = lessons[index + dir];
    const current = lessons[index];
    if (!target || !current) return;
    reorderMutation.mutate({ id: current.id, orderIndex: target.orderIndex });
    reorderMutation.mutate({ id: target.id, orderIndex: current.orderIndex });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyLesson);
    setDialogOpen(true);
  };

  const openEdit = (l: AdminLesson) => {
    setEditing(l);
    setForm({
      title: l.title,
      description: l.description ?? "",
      duration: l.duration ? String(l.duration) : "",
      videoSource: l.videoSource === "drive" ? "drive" : "direct",
      videoUrl: l.videoUrl ?? "",
      driveFileId: l.driveFileId ?? "",
      status: l.status,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={activeCourseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-full sm:w-72" aria-label="اختيار الكورس">
            <SelectValue placeholder="اختر كورسًا" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5 sm:ms-auto" onClick={openCreate} disabled={!activeCourseId}>
          <Plus className="size-4" /> درس جديد
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>الدرس</TableHead>
              <TableHead className="hidden md:table-cell">المدة</TableHead>
              <TableHead className="hidden md:table-cell">المصدر</TableHead>
              <TableHead className="hidden lg:table-cell">الروابط</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-end">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <div className="h-8 bg-muted rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : lessons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  لا دروس في هذا الكورس بعد.
                </TableCell>
              </TableRow>
            ) : (
              lessons.map((l, i) => (
                <TableRow key={l.id}>
                  <TableCell className="tabular-nums">{l.orderIndex + 1}</TableCell>
                  <TableCell>
                    <p className="font-semibold">{l.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {l.description}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {formatDuration(l.duration)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="gap-1">
                      {l.videoSource === "drive" ? (
                        <>
                          <HardDriveDownload className="size-3" /> Drive
                        </>
                      ) : (
                        <>مباشر</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-7 text-xs"
                      onClick={() => setLinksLesson(l)}
                    >
                      <Link2 className="size-3" />
                      {l.linksCount}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.status === "PUBLISHED" ? "default" : "secondary"}>
                      {l.status === "PUBLISHED" ? "منشور" : "مسودة"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="تحريك لأعلى"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="تحريك لأسفل"
                        disabled={i === lessons.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="تعديل" onClick={() => openEdit(l)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="حذف"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(l)}
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

      {/* حوار إضافة/تعديل درس */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الدرس" : "درس جديد"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              // تطبيع فوري: استخراج File ID من الروابط + رفض لينكات المجلدات
              const video = normalizeVideoInput(form);
              if (video.error) {
                toast({
                  title: "مشكلة في مصدر الفيديو",
                  description: video.error,
                  variant: "destructive",
                });
                return;
              }
              if (video.notice) {
                toast({ title: "تم التصحيح تلقائيًا", description: video.notice });
              }
              saveMutation.mutate({
                ...form,
                videoSource: video.videoSource,
                videoUrl: video.videoUrl ?? "",
                driveFileId: video.driveFileId ?? "",
                id: editing?.id,
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="l-title">عنوان الدرس *</Label>
              <Input
                id="l-title"
                required
                minLength={3}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l-desc">وصف الدرس</Label>
              <Textarea
                id="l-desc"
                rows={4}
                placeholder="شرح تفصيلي يظهر أسفل الفيديو…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="l-duration">المدة (بالثواني)</Label>
                <Input
                  id="l-duration"
                  type="number"
                  min={0}
                  dir="ltr"
                  placeholder="600"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLISHED">منشور</SelectItem>
                    <SelectItem value="DRAFT">مسودة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <Label>مصدر الفيديو (FR-12)</Label>
              <Tabs
                value={form.videoSource}
                onValueChange={(v) =>
                  setForm({ ...form, videoSource: v as "direct" | "drive" })
                }
              >
                <TabsList className="w-full">
                  <TabsTrigger value="direct" className="flex-1">رابط مباشر</TabsTrigger>
                  <TabsTrigger value="drive" className="flex-1">Google Drive</TabsTrigger>
                </TabsList>
                <TabsContent value="direct" className="space-y-2">
                  <Input
                    dir="ltr"
                    placeholder="https://example.com/video.mp4"
                    value={form.videoUrl}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    رابط MP4 مباشر — يدعم حفظ نقطة التوقف داخل المشغل بدقة. لو لصقت لينك Google
                    Drive ملف هيتحوّل تلقائيًا لوضع Drive.
                  </p>
                </TabsContent>
                <TabsContent value="drive" className="space-y-2">
                  <Input
                    dir="ltr"
                    placeholder="Google Drive File ID أو لينك الملف كامل"
                    value={form.driveFileId}
                    onChange={(e) => setForm({ ...form, driveFileId: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    صق لينك الملف كامل (drive.google.com/file/d/<b>FILE_ID</b>/view) أو المعرّف فقط
                    — الاتنين بيشتغلوا. لازم صلاحية الملف تكون «أي شخص لديه الرابط».
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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

      {/* حوار الروابط */}
      <LinksDialog lesson={linksLesson} onClose={() => setLinksLesson(null)} />

      {/* تأكيد الحذف */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الدرس؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleting?.title}» وروابطه وسجلات تقدم الطلاب فيه.
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

// ─── حوار إدارة روابط الدرس (FR-11) ───
function LinksDialog({ lesson, onClose }: { lesson: AdminLesson | null; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("link");

  const { data } = useQuery({
    queryKey: ["admin", "lessons", lesson?.id, "links"],
    queryFn: async () => {
      // نجلب الروابط من درس صفحة الطالب العامة (لا تحتاج صلاحية admin)
      return api<{ links: LinkItem[] }>(`/api/lessons/${lesson!.id}`);
    },
    enabled: Boolean(lesson),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api("/api/admin/links", {
        method: "POST",
        body: JSON.stringify({ lessonId: lesson!.id, title, url, type }),
      }),
    onSuccess: () => {
      toast({ title: "تمت إضافة الرابط" });
      setTitle("");
      setUrl("");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "lessons", lesson?.id, "links"],
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "lessons"] });
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/links?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "lessons", lesson?.id, "links"],
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "lessons"] });
      toast({ title: "تم حذف الرابط" });
    },
  });

  const links = data?.links ?? [];

  return (
    <Dialog open={Boolean(lesson)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderGit2 className="size-4 text-primary" />
            روابط وملفات: {lesson?.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-72">
          <div className="space-y-2 pe-3">
            {links.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا روابط بعد — أضف أول رابط أدناه.
              </p>
            )}
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{link.title}</p>
                  <p dir="ltr" className="text-[11px] text-muted-foreground truncate text-end">
                    {link.url}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">{link.type}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive shrink-0"
                  aria-label="حذف الرابط"
                  onClick={() => deleteMutation.mutate(link.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="lk-title">عنوان الرابط *</Label>
            <Input
              id="lk-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ملف الشرح، مستودع الكود…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lk-url">الرابط *</Label>
            <Input
              id="lk-url"
              dir="ltr"
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label>النوع</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">رابط</SelectItem>
                <SelectItem value="file">ملف</SelectItem>
                <SelectItem value="github">مستودع</SelectItem>
                <SelectItem value="doc">مستند</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" className="gap-1.5" disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              إضافة رابط
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

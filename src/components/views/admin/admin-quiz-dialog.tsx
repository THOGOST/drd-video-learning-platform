"use client";

// حوار إدارة أسئلة اختبار الدرس (أدمن): عرض + إضافة + حذف
// قاعدة الاجتياز: الإجابة الصحيحة على كل الأسئلة.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { HelpCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client";

type AdminQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  orderIndex: number;
};

type Props = {
  lesson: { id: string; title: string } | null;
  onClose: () => void;
};

const emptyForm = { question: "", options: ["", "", "", ""], correctIndex: 0 };

export function AdminQuizDialog({ lesson, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "quiz", lesson?.id],
    queryFn: () =>
      api<{ questions: AdminQuizQuestion[] }>(`/api/admin/quiz?lessonId=${lesson?.id}`),
    enabled: Boolean(lesson),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "quiz", lesson?.id] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "lessons"] });
  };

  // الخيارات المعبأة فقط (السيرفر يتجاهل الفارغة بنفس المنطق)
  const visible = form.options
    .map((text, originalIndex) => ({ text, originalIndex }))
    .filter((x) => x.text.trim());
  const correctVisibleIndex = visible.findIndex((x) => x.originalIndex === form.correctIndex);
  const canSubmit =
    form.question.trim().length >= 3 && visible.length >= 2 && correctVisibleIndex >= 0;

  const addMutation = useMutation({
    mutationFn: () =>
      api("/api/admin/quiz", {
        method: "POST",
        body: JSON.stringify({
          lessonId: lesson?.id,
          question: form.question,
          options: visible.map((x) => x.text),
          correctIndex: correctVisibleIndex >= 0 ? correctVisibleIndex : 0,
        }),
      }),
    onSuccess: () => {
      toast({ title: "تمت إضافة السؤال" });
      setForm({ ...emptyForm });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/quiz?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "تم حذف السؤال" });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={Boolean(lesson)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="size-4 text-primary" />
            اختبار الدرس: {lesson?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* الأسئلة الحالية */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="h-16 bg-muted rounded animate-pulse" />
            ) : (data?.questions.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا أسئلة بعد — أضف أول سؤال أدناه. لن يُقفل الدرس التالي إلا بعد إضافة أسئلة
                واجتياز الطالب لها.
              </p>
            ) : (
              data!.questions.map((q, i) => (
                <div key={q.id} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      {i + 1}. {q.question}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="حذف السؤال"
                      className="text-destructive hover:text-destructive size-7 shrink-0"
                      onClick={() => deleteMutation.mutate(q.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((o, oi) => (
                      <Badge
                        key={oi}
                        variant={oi === q.correctIndex ? "default" : "secondary"}
                        className="text-[11px]"
                      >
                        {o}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* إضافة سؤال جديد */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <Label className="text-sm font-semibold">سؤال جديد</Label>
            <Input
              placeholder="نص السؤال…"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {form.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-option"
                    aria-label={`الإجابة الصحيحة: الخيار ${oi + 1}`}
                    checked={form.correctIndex === oi}
                    onChange={() => setForm({ ...form, correctIndex: oi })}
                    className="accent-[hsl(var(--primary))]"
                  />
                  <Input
                    placeholder={`الخيار ${oi + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const options = [...form.options];
                      options[oi] = e.target.value;
                      setForm({ ...form, options });
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              اختر الزر الدائري بجانب الإجابة الصحيحة — يكفي تعبئة خيارين على الأقل.
            </p>
            <DialogFooter className="gap-2">
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!canSubmit || addMutation.isPending}
                className="gap-1.5"
              >
                {addMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                إضافة السؤال
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

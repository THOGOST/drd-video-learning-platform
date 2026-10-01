"use client";

// اختبار الدرس (FR جديد): أسئلة اختيار من متعدد — اجتياز كامل الإجابات الصحيحة
// يفتح الدرس التالي عند النجاح، مع احتفال خفيف عند الاجتياز.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, HelpCircle, Loader2, RotateCcw, Trophy, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

type QuizResponse = {
  passed: boolean;
  score: number | null;
  total: number;
  questions: { id: string; question: string; options: string[]; orderIndex: number }[];
};

type SubmitResult = {
  passed: boolean;
  score: number;
  total: number;
  correctAnswers: Record<string, number>;
};

type Props = { lessonId: string; onPassed?: () => void };

export function LessonQuiz({ lessonId, onPassed }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz", lessonId],
    queryFn: () => api<QuizResponse>(`/api/lessons/${lessonId}/quiz`),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      api<SubmitResult>(`/api/lessons/${lessonId}/quiz`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      }),
    onSuccess: (res) => {
      setResult(res);
      if (res.passed) {
        void queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] });
        void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
        void queryClient.invalidateQueries({ queryKey: ["course"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        onPassed?.();
        toast({
          title: "أحسنت! اجتزت الاختبار 🎉",
          description: "تم فتح الدرس التالي إن وُجد.",
        });
      } else {
        toast({
          title: "لم تجتز الاختبار بعد",
          description: "راجع الإجابات الصحيحة باللون الأخضر وحاول مرة أخرى.",
          variant: "destructive",
        });
      }
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.questions.length === 0) return null; // لا اختبار لهذا الدرس

  const allAnswered = data.questions.every((q) => answers[q.id] !== undefined);
  const alreadyPassed = data.passed;

  return (
    <Card className="border-primary/25">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <HelpCircle className="size-4 text-primary" />
          اختبار الدرس
          {alreadyPassed && (
            <Badge className="gap-1 bg-primary/15 text-primary border-transparent">
              <Trophy className="size-3" /> اجتزته سابقًا
            </Badge>
          )}
          {!alreadyPassed && (
            <Badge variant="secondary" className="text-[11px]">
              مطلوب الإجابة الصحيحة على كل الأسئلة لفتح الدرس التالي
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.questions.map((q, qi) => {
          const correctIdx = result?.correctAnswers[q.id];
          return (
            <div key={q.id} className="space-y-2">
              <Label className="text-sm font-semibold block">
                {qi + 1}. {q.question}
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi;
                  const isCorrect = result && correctIdx === oi;
                  const isWrongPick =
                    result && selected && correctIdx !== undefined && correctIdx !== oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => !result && setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      disabled={Boolean(result)}
                      aria-pressed={selected}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-start text-sm transition-all",
                        "hover:border-primary/50 hover:bg-accent/60",
                        selected && !result && "border-primary bg-primary/10 font-medium",
                        isCorrect && "border-green-600/60 bg-green-500/10 text-green-700 dark:text-green-400",
                        isWrongPick && "border-red-500/60 bg-red-500/10",
                        result && !isCorrect && !isWrongPick && "opacity-60"
                      )}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                      ) : isWrongPick ? (
                        <XCircle className="size-4 shrink-0 text-red-500" />
                      ) : (
                        <span
                          className={cn(
                            "size-4 rounded-full border-2 shrink-0 grid place-items-center",
                            selected && "border-primary"
                          )}
                        >
                          {selected && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                      )}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-lg px-4 py-3 text-sm font-medium",
              result.passed
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            {result.passed
              ? `ممتاز! نتيجتك ${result.score}/${result.total} — اتحفظت في سجلك واتفتح الدرس الجاي.`
              : `نتيجتك ${result.score}/${result.total} — الصح متعلم بالأخضر فوق، عدّل إجاباتك وحاول تاني.`}
          </motion.div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!result && (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!allAnswered || submitMutation.isPending}
              className="gap-1.5"
            >
              {submitMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              تسليم الإجابات
            </Button>
          )}
          {result && !result.passed && (
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              className="gap-1.5"
            >
              <RotateCcw className="size-4" />
              المحاولة مرة أخرى
            </Button>
          )}
          {result?.passed && (
            <Badge variant="outline" className="gap-1 text-primary border-primary/40">
              <Trophy className="size-3" />
              اكتمل الاختبار بنجاح
            </Badge>
          )}
          {!allAnswered && !result && (
            <span className="text-xs text-muted-foreground">
              أجب على كل الأسئلة لتفعيل زر التسليم
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

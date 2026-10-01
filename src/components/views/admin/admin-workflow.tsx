"use client";

// تشغيل فحوصات الـ Workflow وعرض سجلها (القسم 12 من الوثيقة)
// منطق الفحص معزول على السيرفر في src/lib/workflow.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, PlayCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api, formatDateTime } from "@/lib/client";

type WorkflowCheck = { id: string; severity: "OK" | "WARN" | "ERROR"; message: string };
type WorkflowResult = {
  name: string;
  status: "SUCCESS" | "WARNING" | "FAILED";
  checks: WorkflowCheck[];
  summary: string;
  ranAt: string;
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  SUCCESS: { label: "سليم", variant: "default" },
  WARNING: { label: "تحذيرات", variant: "secondary" },
  FAILED: { label: "أخطاء", variant: "destructive" },
};

const SEVERITY_ICON = {
  OK: CheckCircle2,
  WARN: AlertTriangle,
  ERROR: XCircle,
};

export function AdminWorkflow() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ["admin", "workflow"],
    queryFn: () =>
      api<{
        history: { id: string; name: string; status: string; summary: string | null; createdAt: string }[];
      }>("/api/admin/workflow"),
  });

  const runMutation = useMutation({
    mutationFn: () => api<{ result: WorkflowResult }>("/api/admin/workflow", { method: "POST" }),
    onSuccess: ({ result }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "workflow"] });
      toast({
        title: `انتهى الفحص: ${result.summary}`,
        variant: result.status === "FAILED" ? "destructive" : "default",
      });
    },
  });

  const lastResult = runMutation.data?.result;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">فحص صحة بيانات الفيديو والمحتوى</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            فحص دوري آلي يتحقق من: الدروس المنشورة بلا فيديو، صحة معرفات Google Drive،
            الكورسات الفارغة، سجلات التقدم خارج النطاق، والروابط غير الصالحة. منطق الفحص
            معزول على السيرفر (src/lib/workflow.ts) حتى يمكن لاحقًا توصيله بمزود
            Workflow خارجي دون تغيير الواجهة.
          </p>
          <Button
            className="gap-2"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
          >
            {runMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlayCircle className="size-4" />
            )}
            تشغيل الفحص الآن
          </Button>

          {lastResult && (
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE[lastResult.status].variant}>
                  {STATUS_BADGE[lastResult.status].label}
                </Badge>
                <span className="text-sm font-medium">{lastResult.summary}</span>
              </div>
              <ul className="space-y-1.5 pt-1">
                {lastResult.checks.map((c) => {
                  const Icon = SEVERITY_ICON[c.severity];
                  return (
                    <li key={c.id} className="flex items-start gap-2 text-sm">
                      <Icon
                        className={`size-4 mt-0.5 shrink-0 ${
                          c.severity === "ERROR"
                            ? "text-destructive"
                            : c.severity === "WARN"
                              ? "text-amber-500"
                              : "text-primary"
                        }`}
                      />
                      <span>{c.message}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">سجل التشغيلات</CardTitle>
        </CardHeader>
        <CardContent>
          {history?.history.length ? (
            <ul className="space-y-2">
              {history.history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <Badge variant={STATUS_BADGE[h.status]?.variant ?? "secondary"}>
                    {STATUS_BADGE[h.status]?.label ?? h.status}
                  </Badge>
                  <span className="flex-1 text-sm truncate">{h.summary ?? h.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(h.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              لا تشغيلات سابقة.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

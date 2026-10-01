import { adminGuard, ERR, logActivity, ok } from "@/lib/api-helpers";
import { getWorkflowHistory, runVideoHealthCheck } from "@/lib/workflow";

// GET /api/admin/workflow — سجل تشغيلات الـ Workflow
export async function GET() {
  const guard = await adminGuard();
  if (guard.response) return guard.response;

  const history = await getWorkflowHistory();
  return ok({ history });
}

// POST /api/admin/workflow — تشغيل فحص صحة بيانات الفيديو يدويًا
export async function POST() {
  try {
    const guard = await adminGuard();
    if (guard.response) return guard.response;

    const result = await runVideoHealthCheck();
    await logActivity({
      actorId: guard.user.id,
      actorName: guard.user.name,
      action: "WORKFLOW_RUN",
      entity: "workflow",
      detail: `تشغيل «${result.name}»: ${result.summary}`,
      level: result.status === "FAILED" ? "ERROR" : "INFO",
    });

    return ok({ result });
  } catch (e) {
    console.error("[admin:workflow:run]", e);
    return ERR.server();
  }
}

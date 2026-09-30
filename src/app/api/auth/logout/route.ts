import { clearSessionCookie } from "@/lib/auth";
import { ok } from "@/lib/api-helpers";

// POST /api/auth/logout — تسجيل الخروج
export async function POST() {
  await clearSessionCookie();
  return ok({ success: true });
}

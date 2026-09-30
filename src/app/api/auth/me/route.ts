import { getCurrentUser } from "@/lib/auth";
import { ok } from "@/lib/api-helpers";

// GET /api/auth/me — المستخدم الحالي (أو null للزائر)
export async function GET() {
  const user = await getCurrentUser();
  return ok({ user });
}

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────
// نظام المصادقة — كلمات مرور مشفرة بـ scrypt + جلسات JWT-like موقعة HMAC-SHA256
// الأسرار تُقرأ من Environment Variables (القسم 16: الأمان)
// ─────────────────────────────────────────────────────────────

const SESSION_SECRET =
  process.env.SESSION_SECRET || "drd-dev-secret-change-in-production";
export const SESSION_COOKIE = "drd_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // أسبوع بالثواني

export type SessionPayload = {
  userId: string;
  email: string;
  role: string;
  exp: number;
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

// ─── كلمات المرور ───
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuf = Buffer.from(hash, "hex");
    const testBuf = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuf, testBuf);
  } catch {
    return false;
  }
}

// ─── التوكن (base64url(payload).signature) ───
function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf-8"
  );
}

export function signSession(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = createHmac("sha256", SESSION_SECRET)
      .update(body)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(fromB64url(body)) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── الجلسة على السيرفر ───
export async function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const token = signSession({
    ...payload,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** يرجع المستخدم الحالي من قاعدة البيانات (متحقق من isActive) أو null */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

/** يتحقق أن الطلب من Admin، وإلا يرجع null (FR-13 / القسم 16) */
export async function requireAdmin(): Promise<SafeUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

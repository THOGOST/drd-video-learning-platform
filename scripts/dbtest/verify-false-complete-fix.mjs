// المرحلة 1: تجهيز طالب اختبار الإصلاح + طباعة كوكي الجلسة
// المرحلة 2 (بعد الانتظار في المتصفح): node verify-false-complete-fix.mjs --check <COOKIE>
const BASE = "https://drd-video-learning-platform.vercel.app";
const LESSON = "cmupcklhq0003l804m2u19igd";

const mode = process.argv[2];
const cookie = process.argv[3];

if (mode === "--check") {
  const d = await fetch(BASE + "/api/dashboard", { headers: { Cookie: cookie } });
  const dj = await d.json();
  const c = dj.courses?.find((x) => x.title === "Test 1");
  console.log("حالة الكورس بعد البقاء في الصفحة:", JSON.stringify(c));
  const cw = dj.continueWatching;
  console.log("continueWatching:", JSON.stringify(cw));
  if (c && !c.completed && c.percent >= 40 && c.percent <= 50) {
    console.log("PASS ✔ — لم يُكمل الدرس زورًا (بقي بنسبة 40% كما كانت، أو تقدير أقل منها)");
    process.exit(0);
  }
  console.log("FAIL ✘ — الحالة غير متوقعة (تكتمل زورًا؟)");
  process.exit(1);
}

// ── تجهيز ──
const STU = { email: `qa_fix_${Date.now().toString(36)}@drd.edu`, password: "Test@1234", name: "طالب اختبار الإصلاح" };
const reg = await fetch(BASE + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(STU) });
console.log("register:", reg.status);
const li = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: STU.email, password: STU.password }) });
const ck = li.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
console.log("login:", li.status);

// فتح الدرس (تسجيل تلقائي) ثم ترك أثر lastPosition=40 — نفس سيناريو الباج الأصلي
await fetch(BASE + `/api/lessons/${LESSON}`, { headers: { Cookie: ck } });
const p40 = await fetch(BASE + "/api/progress", {
  method: "POST", headers: { "Content-Type": "application/json", Cookie: ck },
  body: JSON.stringify({ lessonId: LESSON, lastPosition: 40, progressPercent: 40 }),
});
const p40j = await p40.json();
console.log("seed progress 40%:", p40.status, "completed =", p40j.progress.completed);
console.log("COOKIE_FOR_BROWSER:", ck);

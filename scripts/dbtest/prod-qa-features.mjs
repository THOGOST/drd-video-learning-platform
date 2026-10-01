// ============================================================
// اختبار إنتاج شامل لميزات Task 8 (quiz + lock + certificate + import)
// على https://drd-video-learning-platform.vercel.app
// ============================================================
const BASE = "https://drd-video-learning-platform.vercel.app";
const ADMIN = { email: "admin@drd.edu", password: "Admin@123" };
const STU = { email: "qa_auto_03@drd.edu", password: "Test@1234", name: "طالب اختبار آلي" };

const COURSE_SLUG = "javascript-basics1";
const REAL_LESSON_ID = "cmupcklhq0003l804m2u19igd";
const DRIVE_FILE_ID = "14wxAZOLczcO0rAEBX28UyuVr5_tZ-PH5";

let passCount = 0, failCount = 0;
const results = [];
function report(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  ok ? passCount++ : failCount++;
  results.push({ name, ok, detail });
  console.log(`[${mark}] ${name}${detail ? " — " + detail : ""}`);
}

async function req(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let setCookie = res.headers.getSetCookie?.() ?? [];
  let data = null;
  try { data = await res.json(); } catch { /* html أو فراغ */ }
  return { status: res.status, data, setCookie };
}

function cookieFrom(setCookies) {
  const parts = [];
  for (const c of setCookies) parts.push(c.split(";")[0]);
  return parts.join("; ");
}

async function main() {
  console.log("════════════════════════════════════════");
  console.log("اختبار إنتاج: ميزات Task 8 على " + BASE);
  console.log("════════════════════════════════════════");

  // ── 0) الصفحة الرئيسية + دخول الأدمن ──
  const home = await req("/");
  report("T0a الصفحة الرئيسية 200", home.status === 200, `status=${home.status}`);

  const adminLogin = await req("/api/auth/login", { method: "POST", body: ADMIN });
  const adminCookie = cookieFrom(adminLogin.setCookie);
  report("T0b دخول الأدمن", adminLogin.status === 200 && adminCookie, `status=${adminLogin.status}`);

  // طالب جديد نظيف للتجربة الكاملة
  const reg = await req("/api/auth/register", { method: "POST", body: STU });
  report("T0c تسجيل طالب اختبار جديد", reg.status === 200 || reg.status === 409,
    `status=${reg.status}${reg.status === 409 ? " (موجود مسبقًا — سنستخدمه)" : ""}`);
  const stuLogin = await req("/api/auth/login", { method: "POST", body: STU });
  const stuCookie = cookieFrom(stuLogin.setCookie);
  report("T0d دخول الطالب", stuLogin.status === 200 && stuCookie, `status=${stuLogin.status}`);

  // ── 1) بيانات الكورس ──
  const course = await req(`/api/courses/${COURSE_SLUG}`);
  report("T1 بيانات كورس Test 1", course.status === 200 && course.data?.course,
    `status=${course.status}, lessons=${course.data?.lessons?.length ?? "?"}`);
  const lesson1LockedFlag = course.data?.lessons?.find((l) => l.id === REAL_LESSON_ID);
  report("T1b حقل locked موجود في قائمة الدروس", course.data?.lessons?.every((l) => "locked" in l) === true,
    JSON.stringify(lesson1LockedFlag?.locked));

  // ── 2) الطالب يفتح الدرس الأول (عادي) ──
  const l1 = await req(`/api/lessons/${REAL_LESSON_ID}`, { cookie: stuCookie });
  report("T2 الطالب يفتح الدرس الأول 200", l1.status === 200, `status=${l1.status}`);

  // ── 3) الأدمن يضيف درسًا تجريبيًا ثانيًا (سيُحذف لاحقًا) ──
  const mk = await req("/api/admin/lessons", {
    method: "POST", cookie: adminCookie,
    body: { courseId: course.data.course.id, title: "درس تجريبي للاختبار الآلي (سيُحذف)",
      videoSource: "drive", driveFileId: DRIVE_FILE_ID, status: "PUBLISHED" },
  });
  report("T3 إضافة درس تجريبي ثانٍ", mk.status === 200 || mk.status === 201, `status=${mk.status}`);
  const L2 = mk.data?.lesson?.id ?? mk.data?.id;
  console.log("   → معرف الدرس التجريبي:", L2);

  // ── 4) قفل تسلسلي: الطالب يُمنع من الدرس الثاني قبل اجتياز الاختبار ──
  const l2locked = await req(`/api/lessons/${L2}`, { cookie: stuCookie });
  report("T4 الدرس الثاني مقفول 423 قبل الاختبار", l2locked.status === 423,
    `status=${l2locked.status}, prevLessonId=${l2locked.data?.prevLessonId ?? l2locked.data?.data?.prevLessonId}`);
  report("T4b رسالة القفل عربية واضحة",
    /اختبار/.test(l2locked.data?.error ?? l2locked.data?.message ?? ""));

  // ── 5) الأدمن يجيب الإجابة الصحيحة للسؤال الموجود ──
  const adminQuiz = await req(`/api/admin/quiz?lessonId=${REAL_LESSON_ID}`, { cookie: adminCookie });
  const qs = adminQuiz.data?.questions ?? [];
  report("T5 أسئلة اختبار الدرس الأول موجودة", adminQuiz.status === 200 && qs.length > 0,
    `questions=${qs.length}, first="${qs[0]?.question?.slice(0, 40)}"`);
  const correctMap = {};
  for (const q of qs) correctMap[q.id] = q.correctIndex;

  // الطالب يشوف الأسئلة بدون إجابات صحيحة
  const stuQuiz = await req(`/api/lessons/${REAL_LESSON_ID}/quiz`, { cookie: stuCookie });
  const leak = stuQuiz.data?.questions?.some((q) => "correctIndex" in q);
  report("T5b الطالب يرى الأسئلة بدون الإجابات", stuQuiz.status === 200 && !leak,
    `total=${stuQuiz.data?.total}`);

  // ── 6) تسليم إجابات خاطئة → فشل ──
  const wrongAnswers = {};
  for (const q of stuQuiz.data.questions) wrongAnswers[q.id] = (correctMap[q.id] + 1) % q.options.length;
  const wrong = await req(`/api/lessons/${REAL_LESSON_ID}/quiz`, {
    method: "POST", cookie: stuCookie, body: { answers: wrongAnswers },
  });
  report("T6 إجابات خاطئة → passed=false", wrong.status === 200 && wrong.data?.passed === false,
    `score=${wrong.data?.score}/${wrong.data?.total}`);
  report("T6b كشف الإجابة الصحيحة بعد التصحيح", wrong.data?.correctAnswers &&
    Object.keys(wrong.data.correctAnswers).length === stuQuiz.data.questions.length);

  // ── 7) لسه مقفول بعد الفشل ──
  const l2still = await req(`/api/lessons/${L2}`, { cookie: stuCookie });
  report("T7 الدرس الثاني ما زال مقفولًا بعد الفشل", l2still.status === 423, `status=${l2still.status}`);

  // ── 8) تسليم إجابات صحيحة → نجاح + حفظ ──
  const right = await req(`/api/lessons/${REAL_LESSON_ID}/quiz`, {
    method: "POST", cookie: stuCookie, body: { answers: correctMap },
  });
  report("T8 إجابات صحيحة → passed=true", right.status === 200 && right.data?.passed === true,
    `score=${right.data?.score}/${right.data?.total}`);

  // ── 9) اتفتح الدرس الثاني بعد النجاح ──
  const l2open = await req(`/api/lessons/${L2}`, { cookie: stuCookie });
  report("T9 الدرس الثاني انفتح 200 بعد الاجتياز", l2open.status === 200, `status=${l2open.status}`);
  report("T9b meta الاختبار في صفحة الدرس", l2open.data?.quiz?.enabled === false,
    `quiz.enabled=${l2open.data?.quiz?.enabled}`);

  // ── 10) أكمل المشاهدة: تقدم 50% → يظهر في dashboard.continueWatching ──
  const p50 = await req("/api/progress", {
    method: "POST", cookie: stuCookie,
    body: { lessonId: L2, lastPosition: 45, progressPercent: 50 },
  });
  report("T10 حفظ تقدم 50% في الدرس الثاني", p50.status === 200, `percent=${p50.data?.progress?.progressPercent ?? p50.data?.data?.progress?.progressPercent}`);
  const dash = await req("/api/dashboard", { cookie: stuCookie });
  const cw = dash.data?.continueWatching;
  report("T10b continueWatching يرجّع الدرس الجاري", dash.status === 200 && cw?.lessonId === L2,
    cw ? `lesson="${cw.lessonTitle}", percent=${cw.percent}%` : `cw=null, keys=${Object.keys(dash.data ?? {})}`);

  // ── 11) شهادة قبل الإكمال الكامل → مرفوضة 403 ──
  const certEarly = await req(`/api/certificate/${COURSE_SLUG}`, { cookie: stuCookie });
  report("T11 شهادة قبل إكمال الكورس → 403", certEarly.status === 403, `status=${certEarly.status}`);

  // ── 12) إكمال الدرسين → شهادة بكود تحقق ──
  const p1 = await req("/api/progress", {
    method: "POST", cookie: stuCookie,
    body: { lessonId: REAL_LESSON_ID, lastPosition: 100, progressPercent: 100, completed: true },
  });
  const p2 = await req("/api/progress", {
    method: "POST", cookie: stuCookie,
    body: { lessonId: L2, lastPosition: 100, progressPercent: 100, completed: true },
  });
  report("T12 إكمال الدرسين 100%", p1.status === 200 && p2.status === 200);
  const cert = await req(`/api/certificate/${COURSE_SLUG}`, { cookie: stuCookie });
  report("T12b شهادة بعد الإكمال بكود تحقق",
    cert.status === 200 && /^[0-9A-F]{16}$/.test(cert.data?.code ?? ""),
    `code=${cert.data?.code}, name=${cert.data?.studentName}`);

  // ── 13) CRUD أسئلة كامل (إضافة/تعديل/حذف) على الدرس التجريبي ──
  const addQ = await req("/api/admin/quiz", {
    method: "POST", cookie: adminCookie,
    body: { lessonId: L2, question: "سؤال اختبار آلي مؤقت؟", options: ["أ", "ب", "ج"], correctIndex: 1 },
  });
  report("T13a إضافة سؤال (أدمن)", addQ.status === 201 || addQ.status === 200, `status=${addQ.status}`);
  const QID = addQ.data?.question?.id;

  const badQ = await req("/api/admin/quiz", {
    method: "POST", cookie: adminCookie,
    body: { lessonId: L2, question: "سؤال خيارات ناقصة؟", options: ["أ"], correctIndex: 0 },
  });
  report("T13b رفض خيار واحد فقط", badQ.status === 422, `status=${badQ.status}`);

  const patchQ = await req("/api/admin/quiz", {
    method: "PATCH", cookie: adminCookie,
    body: { id: QID, question: "سؤال اختبار آلي مؤقت (معدل)؟", correctIndex: 2 },
  });
  report("T13c تعديل السؤال", patchQ.status === 200 && patchQ.data?.question?.correctIndex === 2);

  const delQ = await req(`/api/admin/quiz?id=${QID}`, { method: "DELETE", cookie: adminCookie });
  report("T13d حذف السؤال", delQ.status === 200, `status=${delQ.status}`);

  // ── 14) استيراد Drive: رفض غير المجلد ──
  const imp1 = await req("/api/admin/lessons/import-drive", {
    method: "POST", cookie: adminCookie,
    body: { courseId: course.data.course.id, folderUrl: `https://drive.google.com/file/d/${DRIVE_FILE_ID}/view` },
  });
  report("T14a رفض رابط ملف (مش مجلد)", imp1.status === 422, `status=${imp1.status}, msg=${imp1.data?.error ?? imp1.data?.message}`);

  const imp2 = await req("/api/admin/lessons/import-drive", {
    method: "POST", cookie: adminCookie,
    body: { courseId: course.data.course.id, folderUrl: "https://example.com/not-drive" },
  });
  report("T14b رفض لينك خارجي", imp2.status === 422, `status=${imp2.status}`);

  const imp3 = await req("/api/admin/lessons/import-drive", {
    method: "POST", cookie: stuCookie,
    body: { courseId: course.data.course.id, folderUrl: "https://drive.google.com/drive/folders/fakeFolderId123" },
  });
  report("T14c منع الطالب من الاستيراد (403/401)", imp3.status === 403 || imp3.status === 401, `status=${imp3.status}`);

  // ── 15) تنظيف: حذف الدرس التجريبي ──
  const del = await req(`/api/admin/lessons?id=${L2}`, { method: "DELETE", cookie: adminCookie });
  report("T15 حذف الدرس التجريبي (تنظيف)", del.status === 200, `status=${del.status}`);

  const courseAfter = await req(`/api/courses/${COURSE_SLUG}`);
  report("T15b الكورس رجع لدرس واحد فقط", courseAfter.data?.lessons?.length === 1,
    `lessons=${courseAfter.data?.lessons?.length}`);

  console.log("\n════════════════════════════════════════");
  console.log(`النتيجة: ${passCount} نجح / ${failCount} فشل من ${passCount + failCount}`);
  console.log("════════════════════════════════════════");
  if (failCount > 0) process.exit(1);
}

main().catch((e) => { console.error("CRASH:", e); process.exit(1); });

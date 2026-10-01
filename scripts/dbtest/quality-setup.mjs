// إعداد اختبار الجودة الأصلية محليًا: إنشاء درس Drive تجريبي + مفتاح وهمي في .env.local
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, existsSync } from "fs";

const p = new PrismaClient();
const ENV_LOCAL = "/home/z/my-project/.env.local";

async function main() {
  // 1) مفتاح وهمي محلي (يُحذف بعد الاختبار) — لإظهار وضع الجودة الأصلية واختبار الرجوع التلقائي
  let envLocal = existsSync(ENV_LOCAL) ? readFileSync(ENV_LOCAL, "utf8") : "";
  if (!envLocal.includes("NEXT_PUBLIC_GOOGLE_API_KEY")) {
    envLocal += "\nNEXT_PUBLIC_GOOGLE_API_KEY=FAKE_KEY_LOCAL_TEST\n";
    writeFileSync(ENV_LOCAL, envLocal);
    console.log("env.local: fake key added");
  }

  // 2) درس Drive تجريبي في كورس javascript-basics
  const course = await p.course.findUnique({ where: { slug: "javascript-basics" } });
  if (!course) throw new Error("course not found");
  const title = "درس اختبار الجودة الأصلية";
  const existing = await p.lesson.findFirst({ where: { courseId: course.id, title } });
  if (existing) {
    console.log("LESSON_EXISTS", existing.id);
    return;
  }
  const maxOrder = await p.lesson.aggregate({
    where: { courseId: course.id },
    _max: { orderIndex: true },
  });
  const lesson = await p.lesson.create({
    data: {
      courseId: course.id,
      title,
      description: "درس مؤقت لاختبار وضع الجودة الأصلية — يُحذف بعد الاختبار",
      orderIndex: (maxOrder._max.orderIndex ?? 0) + 1,
      duration: 0,
      videoSource: "drive",
      driveFileId: "14wxAZOLczcO0rAEBX28UyuVr5_tZ-PH5",
      status: "PUBLISHED",
    },
  });
  console.log("LESSON_CREATED", lesson.id);
}

main()
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());

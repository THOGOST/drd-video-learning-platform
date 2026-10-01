// بيانات تجريبية واقعية للمنصة (وفق هيكل الوثيقة)
// التشغيل: npx tsx prisma/seed.ts أو bun prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

// فيديوهات تجريبية محلية داخل /public/videos — استبدلها لاحقًا بـ Google Drive File ID
// من لوحة الإدارة (تبويب الدروس → مصدر الفيديو → Google Drive)
const V = (n: string) => `/videos/${n}.mp4`;
const THUMB = (seed: string) => `https://picsum.photos/seed/${seed}/800/450`;

async function main() {
  console.log("🌱 بدء تعبئة البيانات التجريبية…");

  // تنظيف
  await db.activityLog.deleteMany();
  await db.workflowRun.deleteMany();
  await db.progress.deleteMany();
  await db.courseEnrollment.deleteMany();
  await db.lessonLink.deleteMany();
  await db.lesson.deleteMany();
  await db.course.deleteMany();
  await db.user.deleteMany();

  // ─── المستخدمون ───
  const admin = await db.user.create({
    data: {
      name: "مدير المنصة",
      email: "admin@drd.edu",
      passwordHash: hashPassword("Admin@123"),
      role: "ADMIN",
    },
  });
  const student = await db.user.create({
    data: {
      name: "أحمد محمد",
      email: "student@drd.edu",
      passwordHash: hashPassword("Student@123"),
      role: "STUDENT",
    },
  });
  await db.user.create({
    data: {
      name: "سارة عبدالله",
      email: "sara@drd.edu",
      passwordHash: hashPassword("Student@123"),
      role: "STUDENT",
    },
  });
  console.log("✅ 3 مستخدمين (مدير + طالبان)");

  // ─── كورس 1: JavaScript ───
  const js = await db.course.create({
    data: {
      title: "أساسيات البرمجة بلغة JavaScript",
      slug: "javascript-basics",
      description:
        "ابدأ رحلتك في عالم البرمجة مع لغة JavaScript، اللغة التي تشغل الويب. ستتعلم في هذا الكورس المتغيرات والدوال والكائنات والمصفوفات، وكيف تتعامل مع أحداث الصفحة DOM، وصولًا لبناء أول تفاعل حقيقي داخل موقعك. لا تحتاج أي خبرة سابقة — كل درس يبني على الذي قبله بخطوات واضحة وأمثلة عملية.",
      thumbnail: THUMB("js-course"),
      status: "PUBLISHED",
      sortOrder: 1,
    },
  });

  const jsLessons = [
    {
      title: "مقدمة: ما هي JavaScript ولماذا تتعلمها؟",
      description:
        "نظرة شاملة على دور JavaScript في تطوير الويب: أين تعمل (المتصفح والسيرفر)، ما الذي يمكنك بناؤه بها، وكيف تنسجم مع HTML وCSS. سنجهز أيضًا بيئة العمل ونكتب أول سطر كود في وحدة تحكم المتصفح.\n\nموارد إضافية: توثيق MDN الرسمي وخطة التعلم المقترحة.",
      videoUrl: V("lesson-1"),
      duration: 25,
      links: [
        { title: "توثيق MDN لـ JavaScript", url: "https://developer.mozilla.org/ar/docs/Web/JavaScript", type: "doc" },
        { title: "خطة تعلم الواجهات الأمامية", url: "https://roadmap.sh/frontend", type: "link" },
      ],
    },
    {
      title: "المتغيرات وأنواع البيانات",
      description:
        "كل ما تحتاجه لفهم أساس تخزين البيانات: الفرق بين let وconst، الأنواع الأولية (نصوص، أرقام، منطقية)، والقيم الخاصة null وundefined، وقواعد التسمية الجيدة التي سترافقك طوال مسيرتك البرمجية.",
      videoUrl: V("lesson-2"),
      duration: 20,
      links: [
        { title: "مرجع let و const على MDN", url: "https://developer.mozilla.org/ar/docs/Web/JavaScript/Reference/Statements/let", type: "doc" },
      ],
    },
    {
      title: "الشروط والحلقات التكرارية",
      description:
        "كيف يتخذ برنامجك قرارات؟ شرط if وswitch، ثم التحكم بالتكرار عبر for وwhile. سنحل مسائل عملية شائعة مثل المرور على قائمة عناصر وبناء عدادات، مع أخطاء الشباب الشائعة وكيف تتجنبها.",
      videoUrl: V("lesson-3"),
      duration: 15,
      links: [],
    },
    {
      title: "الدوال ونطاق المتغيرات",
      description:
        "الدوال هي قلب إعادة الاستخدام في البرمجة: التعريف بأنواعه (الإعلانية والسهمية)، المعاملات وقيم الإرجاع، ومفهوم النطاق (Scope) وClosures بشكل مبسط بأمثلة واقعية من مشاريع حقيقية.",
      videoUrl: V("lesson-4"),
      duration: 18,
      links: [
        { title: "مستودع تمارين الدوال", url: "https://github.com/getify/You-Dont-Know-JS", type: "github" },
      ],
    },
    {
      title: "المصفوفات والكائنات في الممارسة",
      description:
        "أهم طرق المصفوفات (map وfilter وreduce) وكيف تغنيك عن حلقات معقدة، ثم تنظيم البيانات داخل الكائنات والوصول لخصائصها. سننهي الدرس بمشروع صغير: إدارة قائمة مهام داخل الذاكرة.",
      videoUrl: V("lesson-5"),
      duration: 22,
      links: [
        { title: "مستند Array على MDN", url: "https://developer.mozilla.org/ar/docs/Web/JavaScript/Reference/Global_Objects/Array", type: "doc" },
        { title: "ملف تمارين الدرس (فيديو)", url: "https://developer.mozilla.org/ar/docs/Web/JavaScript", type: "file" },
      ],
    },
  ];

  for (let i = 0; i < jsLessons.length; i++) {
    const l = jsLessons[i];
    await db.lesson.create({
      data: {
        courseId: js.id,
        title: l.title,
        description: l.description,
        orderIndex: i,
        duration: l.duration,
        videoUrl: l.videoUrl,
        videoSource: "direct",
        status: "PUBLISHED",
        links: { create: l.links },
      },
    });
  }
  console.log("✅ كورس JavaScript (5 دروس)");

  // ─── كورس 2: UI/UX ───
  const uiux = await db.course.create({
    data: {
      title: "تصميم واجهات المستخدم UI/UX من الصفر",
      slug: "ui-ux-design",
      description:
        "رحلة عملية في تصميم تجارب وواجهات جميلة وسهلة الاستخدام. تتعلم أساسيات نظرية الألوان والتايبوغرافي، التسلسل الهرمي البصري، تصميم أنظمة التصميم Design Systems، وأخيرًا مبادئ الواجهات المستجيبة للجوال. الكورس عملي ويشمل تمارين تصميم أسبوعية.",
      thumbnail: THUMB("uiux-course"),
      status: "PUBLISHED",
      sortOrder: 2,
    },
  });

  const uiuxLessons = [
    {
      title: "مبادئ التصميم الجيد: المساحة والتباين والتسلسل البصري",
      description:
        "لماذا بعض الواجهات تبدو «احترافية» فورًا؟ الإجابة في المساحات البيضاء، تباين الأحجام، وترتيب العناصر بتسلسل بصري مقصود. أمثلة قبل/بعد من مواقع حقيقية نعيد تصميمها معًا خطوة بخطوة.",
      videoUrl: V("lesson-6"),
      duration: 20,
      links: [
        { title: "مبادئ التصميم من Google Material", url: "https://m3.material.io/foundations", type: "doc" },
      ],
    },
    {
      title: "نظرية الألوان وبناء لوحات ألوان فعالة",
      description:
        "من دائرة الألوان إلى بناء لوحة 60-30-10: كيف تختار ألوان هويتك، وتضبط درجات الوضع الداكن، وتضمن تباينًا مقروءًا لذوي الإعاقات البصرية وفق معايير WCAG.",
      videoUrl: V("lesson-7"),
      duration: 16,
      links: [],
    },
    {
      title: "التايبوغرافي العربي على الويب",
      description:
        "اختيار الخطوط العربية المناسبة، ضبط ارتفاع الأسطر والمسافات للنص العربي تحديدًا، ومزج الخطوط العربية مع اللاتينية في الواجهات ثنائية اللغة دون كسر الإيقاع البصري.",
      videoUrl: V("lesson-8"),
      duration: 18,
      links: [
        { title: "خطوط Google Arabic", url: "https://fonts.google.com/?subset=arabic", type: "link" },
        { title: "دليل RTL على MDN", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_writing_modes", type: "doc" },
      ],
    },
    {
      title: "من Figma إلى كود: تسليم التصميم للمطور",
      description:
        "كيف تجهز ملف تصميم جاهز للتطبيق: تسمية الطبقات، متغيرات الألوان والمسافات، وقياسات الوضع المستجيب. نطبق ذلك بتسليم شاشة كاملة وتحويلها لكود HTML/CSS فعلي.",
      videoUrl: V("lesson-1"),
      duration: 25,
      links: [
        { title: "Figma للتعلم الذاتي", url: "https://www.figma.com/resource-library/", type: "link" },
      ],
    },
  ];

  for (let i = 0; i < uiuxLessons.length; i++) {
    const l = uiuxLessons[i];
    await db.lesson.create({
      data: {
        courseId: uiux.id,
        title: l.title,
        description: l.description,
        orderIndex: i,
        duration: l.duration,
        videoUrl: l.videoUrl,
        videoSource: "direct",
        status: "PUBLISHED",
        links: { create: l.links },
      },
    });
  }
  console.log("✅ كورس UI/UX (4 دروس)");

  // ─── كورس 3: SQL ───
  const sql = await db.course.create({
    data: {
      title: "قواعد البيانات وSQL من الصفر",
      slug: "sql-databases",
      description:
        "افهم كيف تخزن التطبيقات بياناتها وتسترجعها بسرعة. من مفهوم الجداول والعلاقات، إلى كتابة استعلامات SELECT وJOIN المتقدمة، وصولًا لتصميم مخطط قاعدة بيانات كامل لتطبيق تعليمي حقيقي. تمارين عملية بعد كل درس على قاعدة بيانات فعلية.",
      thumbnail: THUMB("sql-course"),
      status: "PUBLISHED",
      sortOrder: 3,
    },
  });

  const sqlLessons = [
    {
      title: "مقدمة لقواعد البيانات العلائقية",
      description:
        "ما هي قاعدة البيانات العلائقية ولماذا تحتاجها معظم التطبيقات؟ الجداول، الصفوف، الأعمدة، والمفاتيح الأساسية والخارجية — كل ذلك بمثال تطبيق متجر إلكتروني نبني مخططه تدريجيًا.",
      videoUrl: V("lesson-9"),
      duration: 21,
      links: [
        { title: "دليل SQL التفاعلي", url: "https://sqlbolt.com/", type: "link" },
      ],
    },
    {
      title: "استعلامات SELECT وتصفية النتائج",
      description:
        "أوامر SELECT وWHERE وORDER BY وLIMIT: استرجاع ما تريد بالضبط من جدول ضخم. تمارين تفاعلية لاستعلام بيانات طلاب ودرجات بطرق متعددة.",
      videoUrl: V("lesson-10"),
      duration: 17,
      links: [],
    },
    {
      title: "العلاقات وعمليات JOIN",
      description:
        "أقوى ما في قواعد البيانات العلائقية: دمج الجداول عبر INNER وLEFT وRIGHT JOIN. نفكك حالة عملية: تقرير يربط الطلاب بتقدمهم في الكورسات — نفس نمط بيانات هذه المنصة!",
      videoUrl: V("lesson-1"),
      duration: 25,
      links: [
        { title: "مرجع JOIN بصري", url: "https://www.sqltutorial.org/sql-join/", type: "doc" },
      ],
    },
    {
      title: "تصميم مخطط قاعدة بيانات لتطبيق تعليمي",
      description:
        "درس تطبيقي ننهي فيه الكورس: تصميم جداول users وcourses وlessons وprogress من الصفر، مع فهرسة ذكية وقواعد منع التكرار — وهو المخطط نفسه المستخدم في بناء هذه المنصة.",
      videoUrl: V("lesson-2"),
      duration: 20,
      links: [],
    },
  ];

  for (let i = 0; i < sqlLessons.length; i++) {
    const l = sqlLessons[i];
    await db.lesson.create({
      data: {
        courseId: sql.id,
        title: l.title,
        description: l.description,
        orderIndex: i,
        duration: l.duration,
        videoUrl: l.videoUrl,
        videoSource: "direct",
        status: "PUBLISHED",
        links: { create: l.links },
      },
    });
  }
  console.log("✅ كورس SQL (4 دروس)");

  // ─── كورس 4: Python (مسودة لإظهار حالات الإدارة) ───
  const py = await db.course.create({
    data: {
      title: "Python لتطوير الويب والذكاء الاصطناعي",
      slug: "python-web-ai",
      description:
        "كورس قيد الإعداد: أساسيات Python ثم بناء واجهات برمجية REST ومدخل لتطبيقات الذكاء الاصطناعي. سيُنشر قريبًا.",
      thumbnail: THUMB("python-course"),
      status: "DRAFT",
      sortOrder: 4,
    },
  });
  await db.lesson.create({
    data: {
      courseId: py.id,
      title: "تثبيت Python وتهيئة بيئة العمل",
      description: "درس أول (مسودة): تنزيل Python، إعداد البيئة الافتراضية، ومحرر الأكواد.",
      orderIndex: 0,
      duration: 18,
      videoUrl: V("lesson-4"),
      videoSource: "direct",
      status: "DRAFT",
    },
  });
  console.log("✅ كورس Python (مسودة)");

  // ─── تقدم الطالب التجريبي (لعرض الإحصائيات) ───
  const jsLessonsRows = await db.lesson.findMany({
    where: { courseId: js.id },
    orderBy: { orderIndex: "asc" },
  });
  const uiuxLessonsRows = await db.lesson.findMany({
    where: { courseId: uiux.id },
    orderBy: { orderIndex: "asc" },
  });

  // الطالب أنهى درسين كاملين والثالث في المنتصف من كورس JS
  await db.progress.createMany({
    data: [
      {
        userId: student.id,
        lessonId: jsLessonsRows[0].id,
        lastPosition: 25,
        progressPercent: 100,
        completed: true,
      },
      {
        userId: student.id,
        lessonId: jsLessonsRows[1].id,
        lastPosition: 20,
        progressPercent: 100,
        completed: true,
      },
      {
        userId: student.id,
        lessonId: jsLessonsRows[2].id,
        lastPosition: 9,
        progressPercent: 60,
        completed: false,
      },
      {
        userId: student.id,
        lessonId: uiuxLessonsRows[0].id,
        lastPosition: 9,
        progressPercent: 45,
        completed: false,
      },
    ],
  });

  await db.courseEnrollment.createMany({
    data: [
      { userId: student.id, courseId: js.id },
      { userId: student.id, courseId: uiux.id },
    ],
  });
  console.log("✅ تقدم تجريبي للطالب (2 مكتمل + 2 جارٍ)");

  // ─── سجل نشاط وWorkflow أولي ───
  await db.activityLog.createMany({
    data: [
      {
        actorId: admin.id,
        actorName: "مدير المنصة",
        action: "COURSE_CREATE",
        entity: "course",
        detail: "إضافة كورس: أساسيات البرمجة بلغة JavaScript",
      },
      {
        actorId: admin.id,
        actorName: "مدير المنصة",
        action: "COURSE_CREATE",
        entity: "course",
        detail: "إضافة كورس: تصميم واجهات المستخدم UI/UX من الصفر",
      },
      {
        actorId: student.id,
        actorName: "أحمد محمد",
        action: "REGISTER",
        detail: "إنشاء حساب جديد: student@drd.edu",
      },
    ],
  });

  await db.workflowRun.create({
    data: {
      name: "video-health-check",
      status: "SUCCESS",
      result: JSON.stringify({
        name: "video-health-check",
        status: "SUCCESS",
        summary: "الفحص الافتتاحي: كل الفحوصات سليمة",
        ranAt: new Date().toISOString(),
      }),
    },
  });

  console.log("🌿 اكتملت تعبئة البيانات بنجاح!");
  console.log("   مدير:    admin@drd.edu / Admin@123");
  console.log("   طالب:    student@drd.edu / Student@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

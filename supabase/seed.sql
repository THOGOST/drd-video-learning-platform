-- ═══════════════════════════════════════════════════════════════
-- DRD Video Learning Platform — Supabase Seed Data
-- شغّله بعد schema.sql مباشرة (SQL Editor → Run)
-- حسابات الدخول:
--   مدير : admin@drd.edu    / Admin@123
--   طالب : student@drd.edu  / Student@123
--   طالبة: sara@drd.edu     / Student@123
-- كلمات المرور مشفرة scrypt بصيغة salt:hash — متوافقة مع src/lib/auth.ts
-- ═══════════════════════════════════════════════════════════════

-- ─── المستخدمون ───
INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES
('usr_admin_01', 'مدير المنصة', 'admin@drd.edu',
 '7d1b173a1ab3ec8b7331a3d1f6800bae:c9fa84da458a2b576c4aa263ccf9584385a252f6e6d076f6683338f3dc265d40692931bfce6107064846f5e7e3e7ab77f55ec3688ece92d37c10e8c0c1390dfa',
 'ADMIN', TRUE),
('usr_student_01', 'أحمد محمد', 'student@drd.edu',
 'afa015250130692a2215227a0cebadbc:3cc57e6778ca3844bdf5502a2b31cba86c3b9c3f7c669a42f8b5c5a184454635cea2e0e20791ada7adc9cc0fdb174a48eabe76dff7a079568478633a4f4118f7',
 'STUDENT', TRUE),
('usr_student_02', 'سارة عبدالله', 'sara@drd.edu',
 '2f6a359ce72dbda1815fb6992492bb46:bbce61dad62d3d269c223589e400bb1548029adab37e2bed3dc05150ec5357b1b51045cb28af4b48176dc56f7742cf7238f1ec0a81e812df2ed279986189e864',
 'STUDENT', TRUE);

-- ─── الكورسات ───
INSERT INTO courses (id, title, slug, description, thumbnail, status, sort_order) VALUES
('crs_js_01',
 'أساسيات البرمجة بلغة JavaScript',
 'javascript-basics',
 'ابدأ رحلتك في عالم البرمجة مع لغة JavaScript، اللغة التي تشغل الويب. ستتعلم في هذا الكورس المتغيرات والدوال والكائنات والمصفوفات، وكيف تتعامل مع أحداث الصفحة DOM، وصولًا لبناء أول تفاعل حقيقي داخل موقعك. لا تحتاج أي خبرة سابقة — كل درس يبني على الذي قبله بخطوات واضحة وأمثلة عملية.',
 'https://picsum.photos/seed/js-course/800/450', 'PUBLISHED', 1),
('crs_uiux_01',
 'تصميم واجهات المستخدم UI/UX من الصفر',
 'ui-ux-design',
 'رحلة عملية في تصميم تجارب وواجهات جميلة وسهلة الاستخدام. تتعلم أساسيات نظرية الألوان والتايبوغرافي، التسلسل الهرمي البصري، تصميم أنظمة التصميم Design Systems، وأخيرًا مبادئ الواجهات المستجيبة للجوال. الكورس عملي ويشمل تمارين تصميم أسبوعية.',
 'https://picsum.photos/seed/uiux-course/800/450', 'PUBLISHED', 2),
('crs_sql_01',
 'قواعد البيانات وSQL من الصفر',
 'sql-databases',
 'افهم كيف تخزن التطبيقات بياناتها وتسترجعها بسرعة. من مفهوم الجداول والعلاقات، إلى كتابة استعلامات SELECT وJOIN المتقدمة، وصولًا لتصميم مخطط قاعدة بيانات كامل لتطبيق تعليمي حقيقي. تمارين عملية بعد كل درس على قاعدة بيانات فعلية.',
 'https://picsum.photos/seed/sql-course/800/450', 'PUBLISHED', 3),
('crs_py_01',
 'Python لتطوير الويب والذكاء الاصطناعي',
 'python-web-ai',
 'كورس قيد الإعداد: أساسيات Python ثم بناء واجهات برمجية REST ومدخل لتطبيقات الذكاء الاصطناعي. سيُنشر قريبًا.',
 'https://picsum.photos/seed/python-course/800/450', 'DRAFT', 4);

-- ─── الدروس: كورس JavaScript (5) ───
INSERT INTO lessons (id, course_id, title, description, order_index, duration, video_url, video_source, status) VALUES
('lsn_js_01', 'crs_js_01',
 'مقدمة: ما هي JavaScript ولماذا تتعلمها؟',
 'نظرة شاملة على دور JavaScript في تطوير الويب: أين تعمل (المتصفح والسيرفر)، ما الذي يمكنك بناؤه بها، وكيف تنسجم مع HTML وCSS. سنجهز أيضًا بيئة العمل ونكتب أول سطر كود في وحدة تحكم المتصفح.

موارد إضافية: توثيق MDN الرسمي وخطة التعلم المقترحة.',
 0, 25, '/videos/lesson-1.mp4', 'direct', 'PUBLISHED'),
('lsn_js_02', 'crs_js_01',
 'المتغيرات وأنواع البيانات',
 'كل ما تحتاجه لفهم أساس تخزين البيانات: الفرق بين let وconst، الأنواع الأولية (نصوص، أرقام، منطقية)، والقيم الخاصة null وundefined، وقواعد التسمية الجيدة التي سترافقك طوال مسيرتك البرمجية.',
 1, 20, '/videos/lesson-2.mp4', 'direct', 'PUBLISHED'),
('lsn_js_03', 'crs_js_01',
 'الشروط والحلقات التكرارية',
 'كيف يتخذ برنامجك قرارات؟ شرط if وswitch، ثم التحكم بالتكرار عبر for وwhile. سنحل مسائل عملية شائعة مثل المرور على قائمة عناصر وبناء عدادات، مع أخطاء الشباب الشائعة وكيف تتجنبها.',
 2, 15, '/videos/lesson-3.mp4', 'direct', 'PUBLISHED'),
('lsn_js_04', 'crs_js_01',
 'الدوال ونطاق المتغيرات',
 'الدوال هي قلب إعادة الاستخدام في البرمجة: التعريف بأنواعه (الإعلانية والسهمية)، المعاملات وقيم الإرجاع، ومفهوم النطاق (Scope) وClosures بشكل مبسط بأمثلة واقعية من مشاريع حقيقية.',
 3, 18, '/videos/lesson-4.mp4', 'direct', 'PUBLISHED'),
('lsn_js_05', 'crs_js_01',
 'المصفوفات والكائنات في الممارسة',
 'أهم طرق المصفوفات (map وfilter وreduce) وكيف تغنيك عن حلقات معقدة، ثم تنظيم البيانات داخل الكائنات والوصول لخصائصها. سننهي الدرس بمشروع صغير: إدارة قائمة مهام داخل الذاكرة.',
 4, 22, '/videos/lesson-5.mp4', 'direct', 'PUBLISHED');

-- ─── الدروس: كورس UI/UX (4) ───
INSERT INTO lessons (id, course_id, title, description, order_index, duration, video_url, video_source, status) VALUES
('lsn_uiux_01', 'crs_uiux_01',
 'مبادئ التصميم الجيد: المساحة والتباين والتسلسل البصري',
 'لماذا بعض الواجهات تبدو «احترافية» فورًا؟ الإجابة في المساحات البيضاء، تباين الأحجام، وترتيب العناصر بتسلسل بصري مقصود. أمثلة قبل/بعد من مواقع حقيقية نعيد تصميمها معًا خطوة بخطوة.',
 0, 20, '/videos/lesson-6.mp4', 'direct', 'PUBLISHED'),
('lsn_uiux_02', 'crs_uiux_01',
 'نظرية الألوان وبناء لوحات ألوان فعالة',
 'من دائرة الألوان إلى بناء لوحة 60-30-10: كيف تختار ألوان هويتك، وتضبط درجات الوضع الداكن، وتضمن تباينًا مقروءًا لذوي الإعاقات البصرية وفق معايير WCAG.',
 1, 16, '/videos/lesson-7.mp4', 'direct', 'PUBLISHED'),
('lsn_uiux_03', 'crs_uiux_01',
 'التايبوغرافي العربي على الويب',
 'اختيار الخطوط العربية المناسبة، ضبط ارتفاع الأسطر والمسافات للنص العربي تحديدًا، ومزج الخطوط العربية مع اللاتينية في الواجهات ثنائية اللغة دون كسر الإيقاع البصري.',
 2, 18, '/videos/lesson-8.mp4', 'direct', 'PUBLISHED'),
('lsn_uiux_04', 'crs_uiux_01',
 'من Figma إلى كود: تسليم التصميم للمطور',
 'كيف تجهز ملف تصميم جاهز للتطبيق: تسمية الطبقات، متغيرات الألوان والمسافات، وقياسات الوضع المستجيب. نطبق ذلك بتسليم شاشة كاملة وتحويلها لكود HTML/CSS فعلي.',
 3, 25, '/videos/lesson-1.mp4', 'direct', 'PUBLISHED');

-- ─── الدروس: كورس SQL (4) ───
INSERT INTO lessons (id, course_id, title, description, order_index, duration, video_url, video_source, status) VALUES
('lsn_sql_01', 'crs_sql_01',
 'مقدمة لقواعد البيانات العلائقية',
 'ما هي قاعدة البيانات العلائقية ولماذا تحتاجها معظم التطبيقات؟ الجداول، الصفوف، الأعمدة، والمفاتيح الأساسية والخارجية — كل ذلك بمثال تطبيق متجر إلكتروني نبني مخططه تدريجيًا.',
 0, 21, '/videos/lesson-9.mp4', 'direct', 'PUBLISHED'),
('lsn_sql_02', 'crs_sql_01',
 'استعلامات SELECT وتصفية النتائج',
 'أوامر SELECT وWHERE وORDER BY وLIMIT: استرجاع ما تريد بالضبط من جدول ضخم. تمارين تفاعلية لاستعلام بيانات طلاب ودرجات بطرق متعددة.',
 1, 17, '/videos/lesson-10.mp4', 'direct', 'PUBLISHED'),
('lsn_sql_03', 'crs_sql_01',
 'العلاقات وعمليات JOIN',
 'أقوى ما في قواعد البيانات العلائقية: دمج الجداول عبر INNER وLEFT وRIGHT JOIN. نفكك حالة عملية: تقرير يربط الطلاب بتقدمهم في الكورسات — نفس نمط بيانات هذه المنصة!',
 2, 25, '/videos/lesson-1.mp4', 'direct', 'PUBLISHED'),
('lsn_sql_04', 'crs_sql_01',
 'تصميم مخطط قاعدة بيانات لتطبيق تعليمي',
 'درس تطبيقي ننهي فيه الكورس: تصميم جداول users وcourses وlessons وprogress من الصفر، مع فهرسة ذكية وقواعد منع التكرار — وهو المخطط نفسه المستخدم في بناء هذه المنصة.',
 3, 20, '/videos/lesson-2.mp4', 'direct', 'PUBLISHED');

-- ─── الدروس: كورس Python (مسودة) ───
INSERT INTO lessons (id, course_id, title, description, order_index, duration, video_url, video_source, status) VALUES
('lsn_py_01', 'crs_py_01',
 'تثبيت Python وتهيئة بيئة العمل',
 'درس أول (مسودة): تنزيل Python، إعداد البيئة الافتراضية، ومحرر الأكواد.',
 0, 18, '/videos/lesson-4.mp4', 'direct', 'DRAFT');

-- ─── الروابط والموارد ───
INSERT INTO lesson_links (id, lesson_id, title, url, type) VALUES
('lnk_01', 'lsn_js_01', 'توثيق MDN لـ JavaScript', 'https://developer.mozilla.org/ar/docs/Web/JavaScript', 'doc'),
('lnk_02', 'lsn_js_01', 'خطة تعلم الواجهات الأمامية', 'https://roadmap.sh/frontend', 'link'),
('lnk_03', 'lsn_js_02', 'مرجع let و const على MDN', 'https://developer.mozilla.org/ar/docs/Web/JavaScript/Reference/Statements/let', 'doc'),
('lnk_04', 'lsn_js_04', 'مستودع تمارين الدوال', 'https://github.com/getify/You-Dont-Know-JS', 'github'),
('lnk_05', 'lsn_js_05', 'مستند Array على MDN', 'https://developer.mozilla.org/ar/docs/Web/JavaScript/Reference/Global_Objects/Array', 'doc'),
('lnk_06', 'lsn_js_05', 'ملف تمارين الدرس', 'https://developer.mozilla.org/ar/docs/Web/JavaScript', 'file'),
('lnk_07', 'lsn_uiux_01', 'مبادئ التصميم من Google Material', 'https://m3.material.io/foundations', 'doc'),
('lnk_08', 'lsn_uiux_03', 'خطوط Google Arabic', 'https://fonts.google.com/?subset=arabic', 'link'),
('lnk_09', 'lsn_uiux_03', 'دليل RTL على MDN', 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_writing_modes', 'doc'),
('lnk_10', 'lsn_uiux_04', 'Figma للتعلم الذاتي', 'https://www.figma.com/resource-library/', 'link'),
('lnk_11', 'lsn_sql_01', 'دليل SQL التفاعلي', 'https://sqlbolt.com/', 'link'),
('lnk_12', 'lsn_sql_03', 'مرجع JOIN بصري', 'https://www.sqltutorial.org/sql-join/', 'doc');

-- ─── تسجيلات الكورسات ───
INSERT INTO course_enrollments (id, user_id, course_id) VALUES
('enr_01', 'usr_student_01', 'crs_js_01'),
('enr_02', 'usr_student_01', 'crs_uiux_01'),
('enr_03', 'usr_student_02', 'crs_js_01');

-- ─── التقدم التجريبي (أحمد: 2 مكتمل + 2 جارٍ) ───
INSERT INTO progress (id, user_id, lesson_id, last_position, progress_percent, completed) VALUES
('prg_01', 'usr_student_01', 'lsn_js_01', 25, 100, TRUE),
('prg_02', 'usr_student_01', 'lsn_js_02', 20, 100, TRUE),
('prg_03', 'usr_student_01', 'lsn_js_03', 9, 60, FALSE),
('prg_04', 'usr_student_01', 'lsn_uiux_01', 9, 45, FALSE);

-- ─── سجل النشاط ───
INSERT INTO activity_logs (id, actor_id, actor_name, action, entity, detail) VALUES
('act_01', 'usr_admin_01', 'مدير المنصة', 'COURSE_CREATE', 'course', 'إضافة كورس: أساسيات البرمجة بلغة JavaScript'),
('act_02', 'usr_admin_01', 'مدير المنصة', 'COURSE_CREATE', 'course', 'إضافة كورس: تصميم واجهات المستخدم UI/UX من الصفر'),
('act_03', 'usr_student_01', 'أحمد محمد', 'REGISTER', NULL, 'إنشاء حساب جديد: student@drd.edu');

-- ─── Workflow أولي ───
INSERT INTO workflow_runs (id, name, status, result) VALUES
('wfr_01', 'video-health-check', 'SUCCESS',
 '{"name":"video-health-check","status":"SUCCESS","summary":"الفحص الافتتاحي: كل الفحوصات سليمة"}');

-- ═══════════════════════════════════════════════════════════════
-- استعلامات تحقق سريعة بعد التشغيل
-- SELECT COUNT(*) FROM users;    -- المتوقع: 3
-- SELECT COUNT(*) FROM courses;  -- المتوقع: 4
-- SELECT COUNT(*) FROM lessons;  -- المتوقع: 14
-- SELECT COUNT(*) FROM lesson_links; -- المتوقع: 12
-- ═══════════════════════════════════════════════════════════════

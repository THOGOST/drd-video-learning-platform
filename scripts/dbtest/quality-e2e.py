# -*- coding: utf-8 -*-
"""اختبار E2E محلي لوضع الجودة الأصلية في مشغل الفيديو:
1) أزرار التبديل تظهر (جودة أصلية / مشغل Drive) + زر التنزيل بجودة أصلية
2) الوضع الأصلي يُحاول أولًا بعنصر <video crossorigin=anonymous> برابط googleapis
3) مفتاح وهمي → خطأ → رجوع تلقائي لمشغل Drive (iframe) + توست
4) حفظ التفضيل في localStorage
"""
import asyncio
import json
import sys

from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
LESSON_URL = f"{BASE}/#/courses/javascript-basics/lessons/cmuprmgwo0001m52x9tk887w9"

results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"{'PASS' if cond else 'FAIL'} | {name} {extra}")


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1360, "height": 900})
        page = await ctx.new_page()
        console_errors = []
        page.on(
            "console",
            lambda m: console_errors.append(m.text) if m.type == "error" else None,
        )

        # دخول الأدمن
        await page.goto(f"{BASE}/#/login", wait_until="networkidle")
        await page.fill('input[type="email"]', "admin@drd.edu")
        await page.fill('input[type="password"]', "Admin@123")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2500)

        # فتح صفحة الدرس التجريبي
        await page.goto(LESSON_URL, wait_until="networkidle")
        await page.wait_for_timeout(3000)

        body = await page.inner_text("body")
        check("toggle جودة أصلية ظاهر", "جودة أصلية" in body)
        check("toggle مشغل Drive ظاهر", "مشغل Drive" in body)
        check("زر تنزيل بجودة أصلية ظاهر", "تنزيل بجودة أصلية" in body)
        check("زر فتح في Drive ظاهر", "فتح في Drive" in body)

        # رابط التنزيل
        dl = await page.query_selector('a[href*="drive.usercontent.google.com"]')
        check("رابط التنزيل صحيح", dl is not None)

        # العنصر الأصلي كان يجب أن يُحاول أولًا ثم يفشل (مفتاح وهمي) ويرجع تلقائيًا
        try:
            await page.wait_for_selector('iframe[title="مشغل Google Drive"]', timeout=15000)
            fallback_ok = True
        except Exception:
            fallback_ok = False
        check("رجوع تلقائي لمشغل Drive (iframe)", fallback_ok)

        body2 = await page.inner_text("body")
        check("توست التحويل التلقائي ظهر", "تم التحويل إلى مشغل Drive" in body2)

        saved = await page.evaluate("() => localStorage.getItem('drd-drive-player-mode')")
        check("التفضيل محفوظ في localStorage (embed)", saved == "embed", f"({saved})")

        # نص المعلومات في وضع embed
        check("نص شرح مشغل Drive", "يغيّر الجودة تلقائيًا" in body2)

        # التبديل اليدوي إلى «مشغل Drive» عبر الزر يعمل (نشط الآن)
        # ثم نرجع للوضع الأصلي: عنصر video يظهر برابط googleapis ثم يرجع iframe مجددًا
        try:
            await page.click("text=جودة أصلية", timeout=5000)
            await page.wait_for_selector("video", timeout=6000)
            src = await page.evaluate(
                "() => { const v = document.querySelector('video'); return v ? v.src : null; }"
            )
            check(
                "الوضع الأصلي يستخدم googleapis alt=media",
                bool(src) and "googleapis.com/drive/v3/files" in src and "alt=media" in src,
                f"src={src[:90] if src else None}",
            )
            co = await page.evaluate(
                "() => { const v = document.querySelector('video'); return v ? v.crossOrigin : null; }"
            )
            check("crossorigin=anonymous مفعّل", co == "anonymous", f"({co})")
            await page.wait_for_selector('iframe[title="مشغل Google Drive"]', timeout=15000)
            check("رجوع تلقائي ثانٍ يعمل بعد التبديل", True)
        except Exception as e:
            check("مسار الوضع الأصلي", False, str(e)[:80])

        # أخطاء كونسول حرجة (استبعاد أخطاء شبكة googleapis المتوقعة 400/403)
        critical = [
            e for e in console_errors
            if "googleapis" not in e and "Failed to load resource" not in e
        ]
        check("لا أخطاء كونسول حرجة", len(critical) == 0, f"({len(critical)})")

        await page.screenshot(path="/home/z/my-project/scripts/dbtest/quality-e2e-final.png")
        await browser.close()

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\nRESULT: {passed}/{len(results)} PASS")
    sys.exit(0 if passed == len(results) else 1)


asyncio.run(asyncio.wait_for(main(), timeout=180))

# -*- coding: utf-8 -*-
"""تحقق إنتاجي: صفحة الدرس الحقيقي على Vercel تعرض أزرار الجودة الجديدة"""
import asyncio
import json
import sys

from playwright.async_api import async_playwright

BASE = "https://drd-video-learning-platform.vercel.app"
LESSON_URL = f"{BASE}/#/courses/javascript-basics1/lessons/cmupcklhq0003l804m2u19igd"

results = []


def check(name, cond, extra=""):
    results.append(bool(cond))
    print(f"{'PASS' if cond else 'FAIL'} | {name} {extra}")


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1360, "height": 900})
        page = await ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        await page.goto(f"{BASE}/#/login", wait_until="networkidle")
        await page.fill('input[type="email"]', "admin@drd.edu")
        await page.fill('input[type="password"]', "Admin@123")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(3000)

        await page.goto(LESSON_URL, wait_until="networkidle")
        await page.reload(wait_until="networkidle")  # إعادة تحميل قسرية لتطبيق المسار
        await page.wait_for_timeout(4500)

        body = await page.inner_text("body")
        print("=== DEBUG BODY (600 chars) ===")
        print(body[:600])
        print("=== URL:", page.url, "===")
        check("صفحة الدرس تفتح", "Test 1" in body or "درس" in body)
        check("زر تنزيل بجودة أصلية ظاهر", "تنزيل بجودة أصلية" in body)
        check("زر فتح في Drive ظاهر", "فتح في Drive" in body)

        dl = await page.query_selector('a[href*="drive.usercontent.google.com"]')
        check("رابط تنزيل الملف الأصلي صحيح", dl is not None)

        iframe = await page.query_selector('iframe[title="مشغل Google Drive"]')
        check("مشغل Drive يعمل (iframe)", iframe is not None)

        # بدون مفتاح API: يجب أن تظهر رسالة الإرشاد بدل أزرار التبديل
        check("رسالة إرشاد المفتاح ظاهرة", "NEXT_PUBLIC_GOOGLE_API_KEY" in body)

        # الموقع لم يعد يعرض نص التقدير الزمني القديم في وضع iframe؟ (يبقى للوضعين) — تجاوز
        critical = [e for e in errors if "googleapis" not in e and "net::" not in e]
        check("لا أخطاء كونسول حرجة", len(critical) == 0, f"({critical[:1]})")

        await page.screenshot(path="/home/z/my-project/scripts/dbtest/prod-quality-check.png")
        await browser.close()

    passed = sum(results)
    print(f"\nRESULT: {passed}/{len(results)} PASS")
    sys.exit(0 if passed == len(results) else 1)


asyncio.run(asyncio.wait_for(main(), timeout=180))

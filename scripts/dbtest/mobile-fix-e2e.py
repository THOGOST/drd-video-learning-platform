# -*- coding: utf-8 -*-
"""اختبار الموبايل النهائي محليًا: زائر + مسجل دخول، كل الصفحات بلا تجاوز + ملء الشاشة"""
import asyncio
import sys

from playwright.async_api import async_playwright

BASE = "https://drd-video-learning-platform.vercel.app"
OUT = "/home/z/my-project/scripts/dbtest/mobile-audit"
LESSON = f"{BASE}/#/courses/javascript-basics/lessons/lsn_js_01"

results = []


def check(name, cond, extra=""):
    results.append(bool(cond))
    print(f"{'PASS' if cond else 'FAIL'} | {name} {extra}")


SCROLL_JS = "() => ({vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth})"


async def visit(page, url):
    await page.goto(url, wait_until="networkidle")
    await page.reload(wait_until="networkidle")
    await page.wait_for_timeout(2200)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for label, vp in [("360", {"width": 360, "height": 800}), ("375", {"width": 375, "height": 667}), ("390", {"width": 390, "height": 844})]:
            ctx = await browser.new_context(viewport=vp, is_mobile=True, has_touch=True)
            page = await ctx.new_page()

            # ── زائر غير مسجل (الحالة اللي كانت بايظة)
            for name, url in [("login", f"{BASE}/#/login"), ("home", f"{BASE}/#/"), ("courses", f"{BASE}/#/courses")]:
                await visit(page, url)
                s = await page.evaluate(SCROLL_JS)
                check(f"[{label}][زائر] {name}", s["sw"] <= s["vw"] + 1, f"(sw={s['sw']} vw={s['vw']})")
            await visit(page, f"{BASE}/#/")
            await page.screenshot(path=f"{OUT}/v2-{label}-guest-home.png")

            # ── مسجل دخول (أدمن)
            await page.goto(f"{BASE}/#/login", wait_until="networkidle")
            await page.fill('input[type="email"]', "admin@drd.edu")
            await page.fill('input[type="password"]', "Admin@123")
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(2500)
            for name, url in [("home", f"{BASE}/#/"), ("courses", f"{BASE}/#/courses"), ("course", f"{BASE}/#/courses/javascript-basics"), ("lesson", LESSON), ("dashboard", f"{BASE}/#/dashboard"), ("admin", f"{BASE}/#/admin")]:
                await visit(page, url)
                s = await page.evaluate(SCROLL_JS)
                check(f"[{label}][أدمن] {name}", s["sw"] <= s["vw"] + 1, f"(sw={s['sw']} vw={s['vw']})")

            await ctx.close()

        # ── ملء الشاشة (theater) على موبايل 360
        ctx = await browser.new_context(viewport={"width": 360, "height": 800}, is_mobile=True, has_touch=True)
        page = await ctx.new_page()
        await page.goto(f"{BASE}/#/login", wait_until="networkidle")
        await page.fill('input[type="email"]', "admin@drd.edu")
        await page.fill('input[type="password"]', "Admin@123")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2500)
        await visit(page, LESSON)

        btn = page.locator('button[aria-label="ملء الشاشة"]')
        check("زر ملء الشاشة موجود", await btn.count() == 1)
        await btn.click()
        await page.wait_for_timeout(600)
        rect = await page.evaluate("""() => {
            const btn = document.querySelector('button[aria-label="الخروج من ملء الشاشة"]');
            if (!btn) return null;
            const el = btn.parentElement;
            const r = el.getBoundingClientRect();
            return {w: Math.round(r.width), h: Math.round(r.height), pos: getComputedStyle(el).position};
        }""")
        check("الحاوية fixed inset-0 ملء الشاشة", rect and rect["pos"] == "fixed" and rect["w"] >= 359 and rect["h"] >= 799, f"({rect})")
        check("التمرير مقفول", await page.evaluate("() => document.body.style.overflow") == "hidden")
        await page.screenshot(path=f"{OUT}/v2-360-theater.png")
        await page.locator('button[aria-label="الخروج من ملء الشاشة"]').click()
        await page.wait_for_timeout(400)
        check("الخروج من ملء الشاشة يعمل", await page.evaluate("() => document.body.style.overflow") != "hidden")
        await ctx.close()
        await browser.close()

    passed = sum(results)
    print(f"\nRESULT: {passed}/{len(results)} PASS")
    sys.exit(0 if passed == len(results) else 1)


asyncio.run(asyncio.wait_for(main(), timeout=300))

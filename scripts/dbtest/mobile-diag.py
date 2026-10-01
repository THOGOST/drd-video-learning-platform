# -*- coding: utf-8 -*-
"""تشخيص محلي: مين العنصر اللي عرضه 381px؟ + فحص وضع المسرح الفعلي"""
import asyncio
import json

from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
LESSON = f"{BASE}/#/courses/javascript-basics/lessons/cmupp9iqn0005m5s6zo4cllpc"

OFFENDERS = """() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('iframe')) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 6 || r.left < -6)) {
      const cls = (typeof el.className === 'string' && el.className)
        ? el.className.trim().split(/\\s+/).slice(0, 6).join(' ') : '';
      out.push({tag: el.tagName, cls: cls.slice(0, 120), w: Math.round(r.width), L: Math.round(r.left), R: Math.round(r.right)});
    }
  });
  return out.slice(0, 8);
}"""


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 360, "height": 800}, is_mobile=True, has_touch=True)
        page = await ctx.new_page()

        await page.goto(f"{BASE}/#/login", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        print("LOGIN offenders:", json.dumps(await page.evaluate(OFFENDERS), ensure_ascii=False, indent=1))

        await page.goto(LESSON, wait_until="networkidle")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(3000)
        print("LESSON offenders:", json.dumps(await page.evaluate(OFFENDERS), ensure_ascii=False, indent=1))

        # فحص وضع المسرح
        info = await page.evaluate("""() => {
            const btn = document.querySelector('button[aria-label="ملء الشاشة"]');
            if (!btn) return {btn: false};
            const container = btn.parentElement;
            return {btn: true, containerClass: container.className, computedPos: getComputedStyle(container).position};
        }""")
        print("BEFORE:", json.dumps(info, ensure_ascii=False))

        await page.locator('button[aria-label="ملء الشاشة"]').click()
        await page.wait_for_timeout(500)
        info2 = await page.evaluate("""() => {
            const btn = document.querySelector('button[aria-label="الخروج من ملء الشاشة"]');
            if (!btn) return {btn: false, labels: [...document.querySelectorAll('button')].map(b => b.getAttribute('aria-label')).filter(Boolean).slice(0, 12)};
            const container = btn.parentElement;
            const r = container.getBoundingClientRect();
            return {btn: true, containerClass: container.className.slice(0, 160), computedPos: getComputedStyle(container).position,
                    w: Math.round(r.width), h: Math.round(r.height)};
        }""")
        print("AFTER:", json.dumps(info2, ensure_ascii=False))

        await browser.close()


asyncio.run(asyncio.wait_for(main(), timeout=120))

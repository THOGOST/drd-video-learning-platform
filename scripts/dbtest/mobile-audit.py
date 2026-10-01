# -*- coding: utf-8 -*-
"""فحص موبايل شامل للموقع على الإنتاج: لقطات + كشف التجاوز الأفقي (overflow) في كل صفحة"""
import asyncio
import json
import os
import sys

from playwright.async_api import async_playwright

BASE = "https://drd-video-learning-platform.vercel.app"
OUT = "/home/z/my-project/scripts/dbtest/mobile-audit"
os.makedirs(OUT, exist_ok=True)

LESSON = f"{BASE}/#/courses/javascript-basics/lessons/lsn_js_01"

PAGES = [
    ("login", f"{BASE}/#/login"),
    ("home", f"{BASE}/#/"),
    ("courses", f"{BASE}/#/courses"),
    ("course-test1", f"{BASE}/#/courses/javascript-basics1"),
    ("lesson-video", LESSON),
    ("dashboard", f"{BASE}/#/dashboard"),
]

DEVICES = [
    ("iphone-se-375", {"viewport": {"width": 375, "height": 667}, "device_scale_factor": 2, "is_mobile": True, "has_touch": True}),
    ("android-360", {"viewport": {"width": 360, "height": 800}, "device_scale_factor": 2, "is_mobile": True, "has_touch": True}),
]

OVERFLOW_JS = """() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('iframe')) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 10 || r.left < -10)) {
      const cls = (typeof el.className === 'string' && el.className)
        ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '';
      bad.push(el.tagName.toLowerCase() + cls + ' [w=' + Math.round(r.width) + ',L=' + Math.round(r.left) + ',R=' + Math.round(r.right) + ']');
    }
  });
  return {
    vw,
    scrollW: document.documentElement.scrollWidth,
    hasHScroll: document.documentElement.scrollWidth > vw + 2,
    offenders: bad.slice(0, 10),
    offenderCount: bad.length,
  };
}"""


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for dev_name, dev in DEVICES:
            ctx = await browser.new_context(**dev)
            page = await ctx.new_page()

            # دخول الأدمن مرة واحدة
            await page.goto(f"{BASE}/#/login", wait_until="networkidle")
            await page.fill('input[type="email"]', "admin@drd.edu")
            await page.fill('input[type="password"]', "Admin@123")
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(3000)

            for name, url in PAGES:
                await page.goto(url, wait_until="networkidle")
                await page.reload(wait_until="networkidle")
                await page.wait_for_timeout(3500)
                info = await page.evaluate(OVERFLOW_JS)
                await page.screenshot(path=f"{OUT}/{dev_name}--{name}.png", full_page=False)
                flag = "!! OVERFLOW" if info["hasHScroll"] else "ok"
                print(f"[{dev_name}] {name}: {flag} scrollW={info['scrollW']} vw={info['vw']} offenders={info['offenderCount']}")
                for o in info["offenders"]:
                    print("    ->", o)

            await ctx.close()
        await browser.close()


asyncio.run(asyncio.wait_for(main(), timeout=300))

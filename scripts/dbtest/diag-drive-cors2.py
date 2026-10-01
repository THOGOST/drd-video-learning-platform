# -*- coding: utf-8 -*-
"""تشخيص مبسط وسريع: fetch فقط مع مهل قاطعة + التقاط أخطاء الشبكة"""
import asyncio
import json

from playwright.async_api import async_playwright

FILE_ID = "14wxAZOLczcO0rAEBX28UyuVr5_tZ-PH5"
U1 = f"https://drive.usercontent.google.com/download?id={FILE_ID}&export=download&confirm=t"

JS = """async (url) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, {headers: {Range: 'bytes=0-1023'}, signal: ctrl.signal, mode: 'cors'});
    clearTimeout(t);
    return {ok: true, status: r.status, type: r.headers.get('content-type')};
  } catch (e) {
    clearTimeout(t);
    return {ok: false, err: String(e), name: e.name};
  }
}"""

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        cdp = await page.context.new_cdp_session(page)
        fails = []
        cdp.on("Network.loadingFailed", lambda m: fails.append(m.params if "params" in m else m))
        await cdp.send("Network.enable")

        for origin in ["https://example.com", "https://drd-video-learning-platform.vercel.app"]:
            fails.clear()
            try:
                await page.goto(origin, wait_until="domcontentloaded", timeout=20000)
            except Exception as e:
                print(f"goto {origin} failed: {e}")
                continue
            res = await asyncio.wait_for(page.evaluate(JS, U1), timeout=20)
            print(f"ORIGIN {origin} ->", json.dumps(res))
            print("  network failures:", json.dumps(fails))

        await browser.close()

asyncio.run(asyncio.wait_for(main(), timeout=90))

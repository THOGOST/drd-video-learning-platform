# -*- coding: utf-8 -*-
"""اختبار 3 تكوينات لتشغيل تيار Drive الأصلي في <video>:
1) drive.usercontent + crossorigin="anonymous" (CORS mode يتجاوز CORP: same-site)
2) drive.google.com/uc?export=download (يحوّل لمكان آخر)
3) فحص CORS + Range عبر fetch داخل الصفحة
"""
import asyncio
import json
import sys

from playwright.async_api import async_playwright

FILE_ID = "14wxAZOLczcO0rAEBX28UyuVr5_tZ-PH5"
U1 = f"https://drive.usercontent.google.com/download?id={FILE_ID}&export=download&confirm=t"
U2 = f"https://drive.google.com/uc?export=download&id={FILE_ID}"


def html(src: str, crossorigin: bool) -> str:
    xg = ' crossorigin="anonymous"' if crossorigin else ""
    return f"""<!DOCTYPE html>
<html><body>
<video id="v" src="{src}"{xg} preload="metadata" playsInline muted></video>
<script>
  window.events = [];
  const v = document.getElementById('v');
  ['error','loadedmetadata','canplay'].forEach(ev =>
    v.addEventListener(ev, e => window.events.push(ev + (v.error ? ':' + v.error.code : '')))
  );
</script>
</body></html>"""


async def try_config(p, name: str, src: str, crossorigin: bool):
    browser = await p.chromium.launch()
    page = await browser.new_page()
    await page.set_content(html(src, crossorigin), wait_until="load")
    ok = True
    try:
        await page.wait_for_function(
            "document.getElementById('v').readyState >= 1", timeout=20000
        )
    except Exception:
        ok = False
    state = await page.evaluate(
        """() => {
        const v = document.getElementById('v');
        return {readyState: v.readyState, networkState: v.networkState,
                duration: v.duration, w: v.videoWidth, h: v.videoHeight,
                err: v.error ? v.error.code + '/' + v.error.message : null,
                ev: window.events};
    }"""
    )
    seek_ok = None
    if ok and (state.get("duration") or 0) > 10:
        await page.evaluate("document.getElementById('v').currentTime = 5")
        try:
            await page.wait_for_function(
                "Math.abs(document.getElementById('v').currentTime - 5) < 1.5", timeout=10000
            )
            seek_ok = True
        except Exception:
            seek_ok = False
    await browser.close()
    passed = ok and not state.get("err") and (state.get("duration") or 0) > 0 and state.get("w", 0) > 0 and seek_ok is True
    print(json.dumps({"config": name, "PASS" if passed else "FAIL": True,
                      "playback": ok, "seek": seek_ok, **state}, ensure_ascii=False))
    return passed


async def main():
    async with async_playwright() as p:
        r1 = await try_config(p, "usercontent+crossorigin", U1, True)
        r2 = await try_config(p, "uc-redirect-nocrossorigin", U2, False)
        r3 = await try_config(p, "uc-redirect+crossorigin", U2, True)

        # فحص fetch CORS مع Range
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("https://example.com", wait_until="domcontentloaded")
        fetch_probe = await page.evaluate(
            """async (url) => {
            try {
                const r = await fetch(url, {headers: {Range: 'bytes=0-1023'}});
                return {ok: true, status: r.status, type: r.headers.get('content-type')};
            } catch (e) { return {ok: false, err: String(e)}; }
        }""",
            U1,
        )
        await browser.close()
        print("fetch-cors-range:", json.dumps(fetch_probe))

        any_pass = r1 or r2 or r3
        print("RESULT:", "PASS" if any_pass else "FAIL")
        sys.exit(0 if any_pass else 1)


if __name__ == "__main__":
    asyncio.run(main())

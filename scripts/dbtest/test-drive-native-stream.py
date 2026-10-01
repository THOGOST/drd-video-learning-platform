# -*- coding: utf-8 -*-
"""اختبار تشغيل حقيقي لتيار Drive الأصلي (drive.usercontent.google.com) داخل عنصر <video> في كروميوم
الهدف: التأكد أن الملف الأصلي يشغّل فعليًا (وليس تنزيلًا) رغم هيدر content-disposition: attachment
"""
import asyncio
import json
import sys

from playwright.async_api import async_playwright

FILE_ID = "14wxAZOLczcO0rAEBX28UyuVr5_tZ-PH5"
MEDIA_URL = f"https://drive.usercontent.google.com/download?id={FILE_ID}&export=download&confirm=t"

HTML = f"""<!DOCTYPE html>
<html><body>
<video id="v" src="{MEDIA_URL}" preload="metadata" playsInline muted></video>
<script>
  window.events = [];
  const v = document.getElementById('v');
  ['error', 'loadedmetadata', 'canplay', 'stalled', 'suspend'].forEach(ev =>
    v.addEventListener(ev, e => window.events.push(ev + (v.error ? ':' + v.error.code : '')))
  );
</script>
</body></html>"""


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_content(HTML, wait_until="load")

        # ننتظر تحميل الميتاداتا
        ok = True
        try:
            await page.wait_for_function("document.getElementById('v').readyState >= 1", timeout=20000)
        except Exception:
            ok = False

        state = await page.evaluate("""() => {
            const v = document.getElementById('v');
            return {
                readyState: v.readyState,
                networkState: v.networkState,
                duration: v.duration,
                videoWidth: v.videoWidth,
                videoHeight: v.videoHeight,
                error: v.error ? v.error.code + '/' + v.error.message : null,
                events: window.events,
            };
        }""")

        # اختبار التقديم (seek عبر Range requests)
        seek_ok = None
        if ok and state.get("duration", 0) > 10:
            await page.evaluate("document.getElementById('v').currentTime = 5")
            try:
                await page.wait_for_function(
                    "Math.abs(document.getElementById('v').currentTime - 5) < 1", timeout=10000
                )
                seek_ok = True
            except Exception:
                seek_ok = False

        result = {
            "playback_ready": ok,
            "seek_works": seek_ok,
            **state,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))

        passed = (
            ok
            and not state.get("error")
            and state.get("duration", 0) > 0
            and state.get("videoWidth", 0) > 0
            and seek_ok is True
        )
        print("RESULT:", "PASS" if passed else "FAIL")
        await browser.close()
        sys.exit(0 if passed else 1)


if __name__ == "__main__":
    asyncio.run(main())

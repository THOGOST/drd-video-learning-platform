# -*- coding: utf-8 -*-
"""اختبار: هل content-disposition: attachment يمنع تشغيل <video crossorigin=anonymous>؟
سيرفر محلي بيدعم Range + ACAO:* + attachment → فيديو في كروميوم
"""
import asyncio
import json
import os
import re
import socket
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = "/home/z/my-project/scripts/dbtest/tmp-attach-test"
SAMPLE = os.path.join(ROOT, "sample.mp4")
PORT = 8765

os.makedirs(ROOT, exist_ok=True)
if not os.path.exists(SAMPLE) or os.path.getsize(SAMPLE) < 10000:
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "testsrc=duration=8:size=640x360:rate=24",
         "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
         "-c:v", "libx264", "-preset", "ultrafast", "-movflags", "+faststart",
         "-c:a", "aac", SAMPLE],
        check=True,
    )


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0]
        if path != "/video.mp4":
            self.send_error(404)
            return
        size = os.path.getsize(SAMPLE)
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        status = 200
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m and (m.group(1) or m.group(2)):
                if m.group(1):
                    start = int(m.group(1))
                if m.group(2):
                    end = int(m.group(2))
                status = 206
        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Content-Disposition", 'attachment; filename="sample.mp4"')
        self.send_header("Access-Control-Allow-Origin", "*")
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        with open(SAMPLE, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(65536, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)

    def log_message(self, *a):
        pass


def serve():
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def main():
    srv = serve()
    from playwright.async_api import async_playwright

    url = f"http://127.0.0.1:{PORT}/video.mp4"
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_content(
            f'<video id="v" src="{url}" crossorigin="anonymous" preload="metadata" muted playsinline></video>',
            wait_until="load",
        )
        try:
            await page.wait_for_function("document.getElementById('v').readyState >= 1", timeout=15000)
            ok = True
        except Exception:
            ok = False
        st = await page.evaluate(
            """() => { const v = document.getElementById('v');
            return {rs: v.readyState, dur: v.duration, w: v.videoWidth, err: v.error ? v.error.code : null}; }"""
        )
        seek = None
        if ok:
            await page.evaluate("document.getElementById('v').currentTime = 5")
            try:
                await page.wait_for_function("Math.abs(document.getElementById('v').currentTime - 5) < 1.5", timeout=8000)
                seek = True
            except Exception:
                seek = False
        print(json.dumps({"playback": ok, "seek": seek, **st}, ensure_ascii=False))
        passed = ok and not st.get("err") and (st.get("dur") or 0) > 0 and seek is True
        print("RESULT:", "PASS" if passed else "FAIL")
        await browser.close()
    srv.shutdown()
    sys.exit(0 if passed else 1)


asyncio.run(main())

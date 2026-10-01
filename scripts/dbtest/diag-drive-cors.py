# -*- coding: utf-8 -*-
"""تشخيص عميق: لماذا يفشل Chromium في تشغيل تيار drive.usercontent؟
نستخدم CDP لالتقاط Network.loadingFailed + responseReceivedExtraInfo (blockedReason)
"""
import asyncio
import json

from playwright.async_api import async_playwright

FILE_ID = "14wxAZOLczcO0rAEBX28UyuVr5_tZ-PH5"
U1 = f"https://drive.usercontent.google.com/download?id={FILE_ID}&export=download&confirm=t"

logs = []


def attach(cdp):
    def on_msg(_, msg):
        m = msg.get("params", {})
        if msg.get("method") == "Network.loadingFailed":
            logs.append(("LOADING_FAILED", m))
        elif msg.get("method") == "Network.responseReceivedExtraInfo":
            logs.append(("EXTRA_INFO", {
                "status": m.get("statusCode"),
                "blockedReason": m.get("blockedReason"),
                "cors": (m.get("headers") or {}).get("access-control-allow-origin"),
                "corp": (m.get("headers") or {}).get("cross-origin-resource-policy"),
                "csp": (m.get("headers") or {}).get("content-security-policy", "")[:60],
                "cd": (m.get("headers") or {}).get("content-disposition"),
            }))

    cdp.on("Network.loadingFailed", on_msg)
    cdp.on("Network.responseReceivedExtraInfo", on_msg)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        cdp = await page.context.new_cdp_session(page)
        attach(cdp)
        await cdp.send("Network.enable")
        await page.goto("https://example.com", wait_until="domcontentloaded")

        # 1) fetch CORS-mode
        f1 = await page.evaluate(
            """async (url) => {
            try {
                const r = await fetch(url, {headers: {Range: 'bytes=0-1023'}});
                const t = await r.text();
                return {ok: true, status: r.status, type: r.headers.get('content-type'), len: t.length};
            } catch (e) { return {ok: false, err: String(e)}; }
        }""",
            U1,
        )
        print("FETCH cors-mode:", json.dumps(f1))
        print("--- network logs after fetch ---")
        for x in logs:
            print(x)
        logs.clear()

        # 2) video crossorigin=anonymous
        await page.set_content(
            f'<video id="v" src="{U1}" crossorigin="anonymous" preload="metadata" muted></video>',
            wait_until="load",
        )
        await page.wait_for_timeout(6000)
        st = await page.evaluate(
            "() => { const v = document.getElementById('v'); return {rs: v.readyState, ns: v.networkState, err: v.error ? v.error.code : null}; }"
        )
        print("VIDEO crossorigin=anonymous:", json.dumps(st))
        print("--- network logs after video ---")
        for x in logs:
            print(x)
        logs.clear()

        # 3) video no-cors عادي
        await page.set_content(
            f'<video id="v2" src="{U1}" preload="metadata" muted></video>',
            wait_until="load",
        )
        await page.wait_for_timeout(6000)
        st2 = await page.evaluate(
            "() => { const v = document.getElementById('v2'); return {rs: v.readyState, ns: v.networkState, err: v.error ? v.error.code : null}; }"
        )
        print("VIDEO no-cors:", json.dumps(st2))
        print("--- network logs after video2 ---")
        for x in logs:
            print(x)

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())

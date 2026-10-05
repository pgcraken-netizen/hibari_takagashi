"""studio.html で描いた素材を WebP に書き出す。
使い方: python3 scripts/art/render.py [名前の前方一致 ...]
例   : python3 scripts/art/render.py room- table food- outfit_ hat_ emoji:
"""
import asyncio
import functools
import http.server
import io
import json
import sys
import threading
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/art"
DATA = json.loads((ROOT / "scripts/art/data.json").read_text())

FOODS = ["ichigo", "bento", "dango", "suika", "kakigori", "mugicha", "yakiimo", "kuri", "kinoko", "soup", "cake", "cocoa"]
OUTFITS = ["outfit_001", "outfit_002", "outfit_003", "outfit_004", "outfit_005", "outfit_006", "outfit_007", "outfit_008", "outfit_009",
           "outfit_010_spring", "outfit_010_summer", "outfit_010_autumn", "outfit_010_winter"]


def emoji_key(e: str) -> str:
    return "-".join(f"{ord(c):x}" for c in e if ord(c) != 0xFE0F)


def jobs():
    out = []
    for s in ["spring", "summer", "autumn", "winter"]:
        out.append((f"room-{s}", 2, OUT / f"room-{s}.webp", 84, False))
    out.append(("table", 2, OUT / "table.webp", 88, True))
    for f in FOODS:
        out.append((f"food-{f}", 2, OUT / "food" / f"{f}.webp", 88, True))
    for o in OUTFITS:
        out.append((o, 1, OUT / "outfit" / f"{o}.webp", 88, True))
    for h in DATA["hats"]:
        out.append((h["id"], 1, OUT / "hat" / f"{h['id']}.webp", 86, True))
    for e in DATA["emojis"]:
        out.append((f"emoji:{e}", 1, OUT / "emoji" / f"{emoji_key(e)}.webp", 88, True))
    return out


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a, **k: None
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


async def main(prefixes):
    httpd = serve()
    missing_only = "--missing" in prefixes
    prefixes = [p for p in prefixes if p != "--missing"]
    todo = [j for j in jobs() if not prefixes or any(j[0].startswith(p) for p in prefixes)]
    if missing_only:
        todo = [j for j in todo if not j[2].exists()]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pages = {}
        for scale in (1, 2):
            pg = await b.new_page(device_scale_factor=scale, viewport={"width": 900, "height": 1100})
            await pg.goto("http://127.0.0.1:8765/scripts/art/studio.html")
            await pg.wait_for_function("window.READY === true", timeout=60000)
            pages[scale] = pg
        for name, scale, path, q, alpha in todo:
            pg = pages[scale]
            try:
                await pg.evaluate("(n) => window.render(n)", name)
            except Exception as ex:  # 絵がない記号（★など）はとばす
                print("skip", name, str(ex).splitlines()[0])
                continue
            el = await pg.query_selector("#stage svg")
            png = await el.screenshot(omit_background=alpha)
            im = Image.open(io.BytesIO(png))
            im = im.convert("RGBA" if alpha else "RGB")
            path.parent.mkdir(parents=True, exist_ok=True)
            im.save(path, "WEBP", quality=q, method=6)
            print("✓", name, im.size)
        await b.close()
    httpd.shutdown()


asyncio.run(main(sys.argv[1:]))

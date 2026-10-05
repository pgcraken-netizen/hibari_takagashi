"""帽子の絵を、ぬいぐるみ（フェルト）っぽく立体に見せる。
python3 scripts/art/plushify.py  → public/art/hat/*.webp を public/art/hat3d/ に書き出す
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/art/hat"
DST = ROOT / "public/art/hat3d"
DST.mkdir(exist_ok=True)
rng = np.random.default_rng(1)
FELT = None


def plush(path: Path):
    global FELT
    im = np.array(Image.open(path).convert("RGBA")).astype(np.float32) / 255
    rgb, a = im[..., :3], im[..., 3]
    h, w = a.shape
    if FELT is None or FELT.shape != a.shape:
        n = rng.random((h, w)).astype(np.float32)
        FELT = cv2.GaussianBlur(n, (0, 0), 0.8) - 0.5
    lum = rgb.mean(axis=2)
    dist = cv2.distanceTransform((a > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    dome = np.sqrt(np.clip(dist / 26.0, 0, 1))  # ふくらみ
    hgt = dome * 1.0 + cv2.GaussianBlur(lum, (0, 0), 3) * 0.35 * (a > 0.5)
    hgt = cv2.GaussianBlur(hgt, (0, 0), 2.0)
    gx = cv2.Sobel(hgt, cv2.CV_32F, 1, 0, ksize=5) / 16
    gy = cv2.Sobel(hgt, cv2.CV_32F, 0, 1, ksize=5) / 16
    nz = np.ones_like(gx)
    nrm = np.sqrt(gx * gx + gy * gy + nz)
    nx, ny, nz = -gx / nrm, -gy / nrm, nz / nrm
    L = np.array([-0.45, -0.65, 0.62])
    L = L / np.linalg.norm(L)
    diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    spec = diff**18 * 0.18
    ao = 0.78 + 0.22 * np.clip(dist / 10.0, 0, 1)
    shade = (0.62 + 0.55 * diff) * ao
    out = rgb * shade[..., None] + spec[..., None]
    out = out * (1 + FELT[..., None] * 0.12)
    out = np.clip(out, 0, 1)
    res = np.dstack([out, a])
    Image.fromarray((res * 255).astype(np.uint8), "RGBA").save(DST / path.name, "WEBP", quality=88, method=6)


if __name__ == "__main__":
    files = sorted(SRC.glob("*.webp"))
    if len(sys.argv) > 1:
        files = [f for f in files if any(f.name.startswith(p) for p in sys.argv[1:])]
    for f in files:
        plush(f)
    print("plush", len(files))

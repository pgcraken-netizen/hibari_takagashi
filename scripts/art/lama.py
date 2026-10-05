"""LaMa（big-lama）で画像の一部を自然に消す。
torch が入った Python で実行する（例：/tmp/claude-0/lamaenv/bin/python）。
重み：https://github.com/enesmsahin/simple-lama-inpainting/releases/download/v0.1.0/big-lama.pt
使い方: python lama.py 入力.png マスク.png 出力.png [x0 y0 x1 y1]
"""
import os
import sys

import numpy as np
import torch
from PIL import Image

WEIGHTS = os.environ.get("LAMA_WEIGHTS", "/tmp/claude-0/big-lama.pt")
_model = None


def model():
    global _model
    if _model is None:
        _model = torch.jit.load(WEIGHTS, map_location="cpu").eval()
    return _model


def inpaint(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """img: HxWx3 uint8 RGB, mask: HxW uint8 (255 = 消す)"""
    h, w = mask.shape
    ph, pw = (8 - h % 8) % 8, (8 - w % 8) % 8
    im = np.pad(img, ((0, ph), (0, pw), (0, 0)), mode="reflect").astype(np.float32) / 255
    m = np.pad((mask > 127).astype(np.float32), ((0, ph), (0, pw)), mode="constant")
    ti = torch.from_numpy(im).permute(2, 0, 1)[None]
    tm = torch.from_numpy(m)[None, None]
    with torch.inference_mode():
        out = model()(ti, tm)[0].permute(1, 2, 0).numpy()
    out = np.clip(out * 255, 0, 255).astype(np.uint8)[:h, :w]
    res = img.copy()
    res[mask > 127] = out[mask > 127]
    return res


if __name__ == "__main__":
    src, msk, dst = sys.argv[1:4]
    img = np.array(Image.open(src).convert("RGB"))
    mask = np.array(Image.open(msk).convert("L"))
    if len(sys.argv) > 4:
        x0, y0, x1, y1 = map(int, sys.argv[4:8])
        sub = inpaint(img[y0:y1, x0:x1], mask[y0:y1, x0:x1])
        img[y0:y1, x0:x1] = sub
    else:
        img = inpaint(img, mask)
    Image.fromarray(img).save(dst)

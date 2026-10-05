"""キービジュアルから高橋先生（顔・手）を切り出して透過PNGにする。
座標はすべてキービジュアル(941x1672)の座標。出力はフレーム F = x130..790, y330..1050。
"""
import cv2
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "scripts/art/keyvisual.png"
OUT = ROOT / "public/art"
FX0, FY0, FX1, FY1 = 130, 330, 790, 1050

im = cv2.imread(str(SRC))
H, W = im.shape[:2]

# GrabCut（顔と手はこれで背景とよく分かれる）
x0, y0, x1, y1 = 140, 560, 760, 1045
crop = im[y0:y1, x0:x1].copy()
mask = np.zeros(crop.shape[:2], np.uint8)
bgd = np.zeros((1, 65), np.float64)
fgd = np.zeros((1, 65), np.float64)
cv2.grabCut(crop, mask, (15, 10, crop.shape[1] - 30, crop.shape[0] - 10), bgd, fgd, 8, cv2.GC_INIT_WITH_RECT)
gc = np.zeros((H, W), np.uint8)
gc[y0:y1, x0:x1] = np.where((mask == 1) | (mask == 3), 255, 0)

def poly(points):
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.array(points, np.int32)], 255)
    return m

# 頭：帽子のつばより下、首まで（聴診器・耳の外の背景は除く）
head_poly = poly([
    (318, 640), (330, 620), (346, 610), (380, 600), (420, 592), (460, 590), (500, 592), (540, 600),
    (575, 616), (603, 634), (622, 652), (640, 670), (662, 700), (660, 760), (640, 790),
    (596, 784), (566, 836), (528, 866), (516, 880), (516, 922), (388, 922), (386, 852), (370, 822), (352, 784),
    (318, 770), (306, 700),
])
# 手（親指を立てた手）
hand_poly = poly([
    (252, 756), (332, 756), (334, 860), (344, 900), (338, 990), (318, 1050), (162, 1050), (166, 900),
    (226, 848), (248, 838),
])

def finish(m, feather=1.2):
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # いちばん大きい塊だけ残す
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    if n > 1:
        keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        m = np.where(lab == keep, 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    # 穴埋め
    ff = m.copy()
    h, w = m.shape
    fm = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, fm, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    return cv2.GaussianBlur(m, (0, 0), feather)

head = finish(gc & head_poly)
# 首の下と帽子ラインはポリゴンで直接切る（GrabCutの外でも確実に）
head = np.minimum(head, cv2.GaussianBlur(head_poly, (0, 0), 1.0))
hand = finish(gc & hand_poly)

def save(mask, name):
    rgba = cv2.cvtColor(im, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = mask
    out = rgba[FY0:FY1, FX0:FX1]
    cv2.imwrite(str(OUT / name), out, [cv2.IMWRITE_WEBP_QUALITY, 92])

save(head, "sensei-head.webp")
save(hand, "sensei-hand.webp")
print("ok")

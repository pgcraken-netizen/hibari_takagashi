"""ホーム画面の参考画像（home-ref.png 941x1672）から、ゲームの素材を作る。
lamaenv の python で実行：/tmp/claude-0/lamaenv/bin/python scripts/art/build_home.py [step...]
出力：public/art/home/
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from lama import inpaint  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "scripts/art/home-ref.png"
OUT = ROOT / "public/art/home"
TMP = Path("/tmp/claude-0/h")
OUT.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)

img = np.array(Image.open(REF).convert("RGB"))
H, W = img.shape[:2]
SCENE = (0, 110, 941, 1082)  # 部屋の範囲

# ---------- キービジュアルの頭 → 参考画像の頭 への変換（両目で合わせる） ----------
KV_L, KV_R = np.array([433.0, 678.0]), np.array([540.0, 697.0])
NW_L, NW_R = np.array([424.0, 513.0]), np.array([512.0, 524.0])
v1, v2 = KV_R - KV_L, NW_R - NW_L
S = np.linalg.norm(v2) / np.linalg.norm(v1)
ANG = np.arctan2(v2[1], v2[0]) - np.arctan2(v1[1], v1[0])
R = np.array([[np.cos(ANG), -np.sin(ANG)], [np.sin(ANG), np.cos(ANG)]])


def kv2new(p):
    return S * R @ (np.array(p, float) - KV_L) + NW_L


# CSS/SVG 用の行列（KV座標 → 参考画像座標）
A = S * R
T = NW_L - A @ KV_L
MATRIX = [A[0, 0], A[1, 0], A[0, 1], A[1, 1], T[0], T[1]]

KV_CUT = [[306, 662], [318, 646], [330, 627], [346, 617], [380, 607], [420, 599], [460, 597], [500, 599], [540, 607], [575, 623], [603, 641], [622, 659], [640, 677], [656, 694]]
CUT = np.array([kv2new(p) for p in KV_CUT])


def poly(points, shape=(H, W)):
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [np.array(points, np.int32)], 255)
    return m


def fill_holes(m):
    ff = m.copy()
    fm = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8)
    cv2.floodFill(ff, fm, (0, 0), 255)
    return m | cv2.bitwise_not(ff)


def largest(m):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    if n <= 1:
        return m
    k = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    return np.where(lab == k, 255, 0).astype(np.uint8)


def save_rgba(rgb, alpha, path, box=None, q=90):
    a = np.dstack([rgb, alpha])
    if box:
        x0, y0, x1, y1 = box
        a = a[y0:y1, x0:x1]
    Image.fromarray(a, "RGBA").save(path, "WEBP", quality=q, method=6)


def save_rgb(rgb, path, box=None, q=88):
    if box:
        x0, y0, x1, y1 = box
        rgb = rgb[y0:y1, x0:x1]
    Image.fromarray(rgb).save(path, "WEBP", quality=q, method=6)


def grabcut(box, iters=8, rect_pad=6):
    x0, y0, x1, y1 = box
    c = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_RGB2BGR)
    m = np.zeros(c.shape[:2], np.uint8)
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(c, m, (rect_pad, rect_pad, c.shape[1] - 2 * rect_pad, c.shape[0] - 2 * rect_pad), bgd, fgd, iters, cv2.GC_INIT_WITH_RECT)
    full = np.zeros((H, W), np.uint8)
    full[y0:y1, x0:x1] = np.where((m == 1) | (m == 3), 255, 0)
    return full


hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
Hh, Ss, Vv = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)


# =====================================================================
def step_masks():
    gc = grabcut((40, 170, 790, 1010), iters=10, rect_pad=20)
    thumb = poly([(238, 600), (242, 584), (252, 577), (262, 581), (269, 598), (270, 662), (236, 672)])
    fig = largest(gc | thumb)
    fig = fill_holes(fig)

    # 頭の切り口より上（帽子）
    above = np.zeros((H, W), np.uint8)
    top = [(int(x), int(y) + 2) for x, y in CUT]
    pts = [(int(CUT[0][0]) - 60, int(CUT[0][1]) + 2)] + top + [(int(CUT[-1][0]) + 70, int(CUT[-1][1]) + 2), (int(CUT[-1][0]) + 70, 150), (int(CUT[0][0]) - 60, 150)]
    above = poly(pts)
    # ひまわりの花びら・葉（黄色・緑）
    head_zone = poly([(220, 180), (720, 180), (720, 660), (220, 660)])
    yellow = ((Hh >= 17) & (Hh <= 38) & (Ss > 110) & (Vv > 140)).astype(np.uint8) * 255
    green = ((Hh >= 38) & (Hh <= 85) & (Ss > 80)).astype(np.uint8) * 255
    petals = (yellow | green) & head_zone & gc
    petals = cv2.morphologyEx(petals, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    hat = (gc & above) | petals
    # 顔の横の花びらのすき間も帽子とみなす
    hat_side = poly([(270, 470), (345, 470), (340, 560), (352, 640), (300, 640)]) | poly([(585, 470), (680, 470), (690, 640), (590, 640), (598, 560)])
    hat |= gc & hat_side & cv2.bitwise_not(((Hh <= 20) | (Vv < 90)).astype(np.uint8) * 255)
    person = fig & cv2.bitwise_not(hat)
    person = cv2.morphologyEx(person, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    person = largest(person)
    person = fill_holes(person | poly([(270, 720), (620, 720), (660, 945), (230, 945)]))
    hat = cv2.dilate(gc & cv2.bitwise_not(person), np.ones((9, 9), np.uint8))

    cv2.imwrite(str(TMP / "person.png"), person)
    cv2.imwrite(str(TMP / "hatmask.png"), hat)
    vis = img.copy()
    vis[person == 0] = (vis[person == 0] * 0.25 + np.array([255, 0, 255]) * 0.75).astype(np.uint8)
    Image.fromarray(vis[150:1010, 40:790]).save(TMP / "person_vis.png")
    print("masks ok")


# =====================================================================
UI_REMOVE = {
    "bubble": [(632, 296), (912, 296), (912, 560), (632, 560)],
    "sign_text": [(52, 168), (198, 168), (198, 254), (52, 254)],
    "sound": [(10, 640), (132, 640), (132, 890), (10, 890)],
    "hitokoto": [(792, 970), (925, 970), (925, 1090), (792, 1090)],
    "calendar": [(795, 575), (865, 575), (865, 650), (795, 650)],
}
FOODS = {
    "dango": (322, 938, 518, 1030),
    "ichigo": (560, 925, 734, 1064),
    "cake": (480, 984, 592, 1080),
}
FOOD_SHAPES = {
    "dango": [("e", (420, 988, 94, 36)), ("r", (352, 940, 486, 1010)), ("r", (480, 952, 512, 972))],
    "ichigo": [("e", (647, 1012, 84, 50)), ("r", (588, 928, 722, 1000))],
    "cake": [("e", (535, 1046, 52, 32)), ("r", (506, 988, 566, 1032))],
}


def food_mask(k):
    m = np.zeros((H, W), np.uint8)
    core = np.zeros((H, W), np.uint8)
    for t, v in FOOD_SHAPES[k]:
        if t == "e":
            cv2.ellipse(m, (v[0], v[1]), (v[2], v[3]), 0, 0, 360, 255, -1)
            cv2.ellipse(core, (v[0], v[1]), (max(1, v[2] - 14), max(1, v[3] - 12)), 0, 0, 360, 255, -1)
        else:
            cv2.rectangle(m, (v[0], v[1]), (v[2], v[3]), 255, -1)
    x0, y0, x1, y1 = FOODS[k]
    gm = np.full((y1 - y0, x1 - x0), cv2.GC_BGD, np.uint8)
    sub = m[y0:y1, x0:x1]
    gm[sub > 0] = cv2.GC_PR_FGD
    gm[core[y0:y1, x0:x1] > 0] = cv2.GC_FGD
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_RGB2BGR), gm, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    out = np.zeros((H, W), np.uint8)
    out[y0:y1, x0:x1] = np.where((gm == 1) | (gm == 3), 255, 0)
    return fill_holes(largest(out))


def step_bg():
    person = cv2.imread(str(TMP / "person.png"), 0)
    hat = cv2.imread(str(TMP / "hatmask.png"), 0)
    m = cv2.dilate(person, np.ones((7, 7), np.uint8)) | hat
    for p in UI_REMOVE.values():
        m |= poly(p)
    for k in FOODS:
        m |= cv2.dilate(food_mask(k), np.ones((13, 13), np.uint8))
    m |= poly([(470, 112), (720, 112), (720, 300), (470, 300)]) & cv2.dilate(hat, np.ones((25, 25), np.uint8))
    x0, y0, x1, y1 = SCENE
    sub = img[y0:y1, x0:x1]
    res = inpaint(sub, m[y0:y1, x0:x1])
    # もう一度（大きい穴を自然に）
    res = inpaint(res, cv2.erode(m[y0:y1, x0:x1], np.ones((15, 15), np.uint8)))
    out = img.copy()
    out[y0:y1, x0:x1] = res
    Image.fromarray(out).save(TMP / "bg_full.png")
    save_rgb(out, OUT / "room-spring.webp", SCENE, q=86)
    print("bg ok")


# =====================================================================
def step_layers():
    person = cv2.imread(str(TMP / "person.png"), 0)
    bg = np.array(Image.open(TMP / "bg_full.png"))
    a = cv2.GaussianBlur(person, (0, 0), 1.0)
    save_rgba(img, a, OUT / "sensei.webp", SCENE, q=92)

    # 手前のテーブル（料理なし）
    line = poly([(0, 948), (941, 942), (941, 1090), (0, 1090)])
    mug = poly([(170, 912), (340, 912), (340, 1090), (170, 1090)])
    easel = poly([(752, 795), (922, 795), (922, 990), (752, 990)])
    vase = poly([(838, 585), (941, 585), (941, 950), (838, 950)])
    fg = line | mug | easel | vase
    # 先生の腕がテーブルの上に出ているところは先生を前に
    fg = fg & cv2.bitwise_not(person & poly([(0, 900), (941, 900), (941, 960), (0, 960)]) & cv2.bitwise_not(mug | easel))
    fg = cv2.GaussianBlur(fg, (0, 0), 1.2)
    save_rgba(bg, fg, OUT / "table.webp", SCENE, q=88)

    # 料理（参考画像の絵をそのまま使う）
    for k, b in FOODS.items():
        fm = food_mask(k)
        save_rgba(img, cv2.GaussianBlur(fm, (0, 0), 0.8), OUT / f"food-{k}.webp", b, q=92)

    # サムネイル用の顔（首まで）
    face = person & poly([(300, 380), (640, 380), (640, 700), (300, 700)])
    save_rgba(img, cv2.GaussianBlur(face, (0, 0), 1.0), OUT / "face.webp", (250, 300, 700, 700), q=90)

    meta = {"matrix": MATRIX, "scene": SCENE, "foods": FOODS, "cut": CUT.round(1).tolist()}
    (OUT / "meta.json").write_text(json.dumps(meta, indent=1))
    print("layers ok", MATRIX)


# =====================================================================
def step_ui():
    # ヘッダー：数字の部分だけ消す
    hdr = img[0:112].copy()
    for (x0, y0, x1, y1) in [(568, 56, 642, 85), (726, 55, 814, 86)]:
        col = np.median(img[y1:y1 + 4, x0:x1].reshape(-1, 3), axis=0)
        hdr[y0:y1, x0:x1] = col.astype(np.uint8)
    save_rgb(hdr, OUT / "header.webp", None, q=90)

    # ぼうしパネル（中身を消す）
    pm = poly([(52, 1316), (888, 1316), (888, 1496), (52, 1496)]) | poly([(14, 1372), (72, 1372), (72, 1450), (14, 1450)]) | poly([(866, 1372), (926, 1372), (926, 1450), (866, 1450)])
    pnl = inpaint(img[1270:1520], pm[1270:1520])
    save_rgb(pnl, OUT / "hatpanel.webp", None, q=88)

    # ボタン5つ
    btns = {"kisekae": (30, 1093, 222, 1252), "cards": (226, 1093, 393, 1252), "about": (398, 1093, 566, 1252), "place": (571, 1093, 740, 1252), "kisetsu": (745, 1093, 918, 1252)}
    save_rgb(img[1080:1270], OUT / "btnrow.webp", None, q=88)
    for k, b in btns.items():
        save_rgb(img, OUT / f"btn-{k}.webp", b, q=90)

    # ナビ：アイコンを切り出し、背景は無地に
    icons = {"home": (50, 1518, 120, 1598), "collection": (215, 1545, 285, 1600), "album": (362, 1540, 442, 1604), "profile": (522, 1540, 590, 1600), "more": (680, 1548, 735, 1596)}
    for k, b in icons.items():
        save_rgb(img, OUT / f"nav-{k}.webp", b, q=92)
    nm = np.zeros((H, W), np.uint8)
    for b in icons.values():
        nm |= poly([(b[0] - 4, b[1] - 2), (b[2] + 4, b[1] - 2), (b[2] + 4, b[3] + 2), (b[0] - 4, b[3] + 2)])
    nm |= poly([(30, 1596), (790, 1596), (790, 1648), (30, 1648)])
    nav = inpaint(img[1500:1672], nm[1500:1672])
    save_rgb(nav, OUT / "nav.webp", None, q=88)
    print("ui ok")


# =====================================================================
def hue_shift_region(rgb, mask, fn):
    hsvi = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    h, s, v = fn(hsvi[..., 0], hsvi[..., 1], hsvi[..., 2])
    out = cv2.cvtColor(np.dstack([h, s, v]).clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2RGB)
    a = (cv2.GaussianBlur(mask, (0, 0), 3) / 255.0)[..., None]
    return (rgb * (1 - a) + out * a).astype(np.uint8)


def step_seasons():
    bg = np.array(Image.open(TMP / "bg_full.png"))
    x0, y0, x1, y1 = SCENE
    hs = cv2.cvtColor(bg, cv2.COLOR_RGB2HSV).astype(int)
    win = poly([(470, 112), (941, 112), (941, 600), (700, 600), (690, 520), (470, 520)]) | poly([(0, 112), (48, 112), (48, 600), (0, 600)]) | poly([(240, 112), (470, 112), (470, 160), (240, 160)])
    pink = (((hs[..., 0] >= 150) | (hs[..., 0] <= 8)) & (hs[..., 1] > 25) & (hs[..., 2] > 120)).astype(np.uint8) * 255
    deco = poly([(250, 112), (941, 112), (941, 330), (250, 330)]) & pink  # 天井の花かざり
    tgt = (win & pink) | deco
    tgt = cv2.dilate(tgt, np.ones((3, 3), np.uint8))
    koi = poly([(842, 118), (941, 118), (941, 238), (842, 238)])

    def make(name, fn, extra=None, remove_koi=True):
        out = bg.copy()
        if remove_koi:
            out[y0:y1, x0:x1] = inpaint(out[y0:y1, x0:x1], koi[y0:y1, x0:x1])
        out = hue_shift_region(out, tgt, fn)
        if extra:
            out = extra(out)
        save_rgb(out, OUT / f"room-{name}.webp", SCENE, q=86)

    # 夏：さくら→あおあおとした葉
    make("summer", lambda h, s, v: (np.full_like(h, 48), np.clip(s * 1.6 + 40, 0, 200), v * 0.92))
    # 秋：さくら→もみじ色
    make("autumn", lambda h, s, v: (np.where(v > 200, 14, 8).astype(np.float32), np.clip(s * 2.2 + 70, 0, 235), v * 0.97))

    # 冬：花→雪（白く）
    def snow(out):
        rng = np.random.default_rng(3)
        o = out.copy()
        m = win.copy()
        for _ in range(260):
            x, y = int(rng.integers(470, 941)), int(rng.integers(112, 600))
            if m[y, x]:
                r = int(rng.integers(2, 5))
                cv2.circle(o, (x, y), r, (255, 255, 255), -1, cv2.LINE_AA)
        return o

    make("winter", lambda h, s, v: (np.full_like(h, 105), s * 0.12, np.clip(v * 1.1 + 25, 0, 255)), snow)
    print("seasons ok")


# =====================================================================
def step_outfits():
    import outfits_home  # noqa

    outfits_home.build(img, TMP, OUT, SCENE, inpaint, poly)


# =====================================================================
def step_extras():
    """参考画像のひまわり帽子を、そのまま「ひまわり」の帽子にする／先生のこと・うりずんの場所の絵"""
    gc = grabcut((40, 170, 790, 1010), iters=10, rect_pad=20)
    person = cv2.imread(str(TMP / "person.png"), 0)
    hat = gc & cv2.bitwise_not(cv2.erode(person, np.ones((3, 3), np.uint8)))
    hat &= poly([(180, 160), (760, 160), (760, 660), (180, 660)])
    hat = cv2.morphologyEx(hat, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    hat = largest(hat)
    hat = fill_holes(hat)
    # 顔にかかる部分（つばの下）は顔に残す
    hat &= cv2.bitwise_not(person & poly([(0, int(CUT[:, 1].min()) + 12), (941, int(CUT[:, 1].min()) + 12), (941, 1000), (0, 1000)]) & cv2.bitwise_not(((Hh >= 17) & (Hh <= 85) & (Ss > 90)).astype(np.uint8) * 255))
    a = cv2.GaussianBlur(hat, (0, 0), 0.8)
    rgba = np.dstack([img, a])
    # KV座標の帽子フレーム（460×370）へ逆変換
    Ainv = np.linalg.inv(A)
    M = np.hstack([Ainv, (-Ainv @ T - np.array([250, 330]))[:, None]])
    warped = cv2.warpAffine(rgba, M, (460, 370), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    Image.fromarray(warped, "RGBA").save(ROOT / "public/art/hat3d/hat_032.webp", "WEBP", quality=90, method=6)
    # 先生のこと：ひまわり帽子の先生（もとの絵のまま）
    Image.fromarray(img[180:900, 120:800]).save(ROOT / "public/art/portrait2.webp", "WEBP", quality=86, method=6)
    print("extras ok")


if __name__ == "__main__":
    steps = sys.argv[1:] or ["masks", "bg", "layers", "ui", "seasons", "outfits", "extras"]
    for s in steps:
        globals()[f"step_{s}"]()

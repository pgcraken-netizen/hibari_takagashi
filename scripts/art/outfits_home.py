"""参考画像の先生の白衣を、塗りなおして衣装をつくる（陰影は元の絵をそのまま使う）。"""
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT_EMOJI = "public/art/emoji"

OUTFITS = {
    "outfit_001": dict(jacket="#34456b", shirt="#ffffff", tie="#d0473f", pocket="#ffffff"),
    "outfit_002": dict(jacket="#7c7e84", tweed=True, shirt="#dbe9f7", check=True),
    "outfit_003": dict(jacket="#8b6a4a", shirt="#fbf6ea"),
    "outfit_004": dict(jacket="#e2a63f", knit=True, shirt="#ffffff", buttons=True),
    "outfit_005": dict(vest="#4f6b4a", shirt="#ffffff", tie="#2f5d8a"),
    "outfit_006": dict(jacket="#2f4c78", keep_tee=True),
    "outfit_007": dict(jacket="#273249", shirt="#ffffff", tie="#2f8f5f", lanyard=True),
    "outfit_009": dict(jacket="#232328", shirt="#ffffff", bow="#c23b3b", pin="1f339"),
    "outfit_010_spring": dict(jacket="#86b56e", shirt="#fff7ec", tie="#f29ab2", pin="1f338"),
    "outfit_010_summer": dict(jacket="#8fc2e6", shirt="#ffffff", pin="1f33b"),
    "outfit_010_autumn": dict(jacket="#9b5a3c", shirt="#fff6e6", tie="#e0a030", pin="1f341"),
    "outfit_010_winter": dict(jacket="#7a3046", shirt="#ffffff", scarf="#e8c27a", pin="2744"),
}


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def build(img, TMP, OUT, SCENE, inpaint, poly):
    H, W = img.shape[:2]
    person = cv2.imread(str(TMP / "person.png"), 0)
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV).astype(int)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    zone = person & poly([(0, 640), (941, 640), (941, 1000), (0, 1000)])
    zone |= person & poly([(330, 600), (580, 600), (580, 640), (330, 640)]) & ((s < 70) | ((h >= 95) & (h <= 130))).astype(np.uint8) * 255
    skin = ((h <= 25) & (s > 50) & (v > 60)).astype(np.uint8) * 255
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    allowed = poly([(360, 590), (545, 590), (545, 705), (360, 705)]) | poly([(80, 780), (330, 780), (330, 965), (80, 965)])
    handp = poly([(182, 572), (334, 572), (336, 700), (304, 812), (190, 812), (174, 700)])
    hand = handp & ((h <= 28) & (s > 30) & (v > 50)).astype(np.uint8) * 255
    hand = cv2.morphologyEx(hand, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(hand)
    if n2 > 1:
        hand = np.where(lab2 == 1 + np.argmax(st2[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    ff2 = hand.copy()
    fm2 = np.zeros((H + 2, W + 2), np.uint8)
    cv2.floodFill(ff2, fm2, (0, 0), 255)
    hand = hand | cv2.bitwise_not(ff2)
    skin = (skin & allowed) | hand
    tee_poly = poly([(390, 686), (502, 684), (528, 760), (536, 948), (366, 948), (372, 760)])
    blue = ((h >= 92) & (h <= 132) & (s > 45)).astype(np.uint8) * 255
    navy = blue & (v < 120).astype(np.uint8) * 255
    tee = blue & (v >= 110).astype(np.uint8) * 255 & tee_poly & ((s > 70)).astype(np.uint8) * 255
    tee = cv2.morphologyEx(tee, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # 聴診器：Tシャツの外の青いもの＋Tシャツの上の濃紺
    steth = (blue & cv2.bitwise_not(tee_poly)) | (navy & tee_poly)
    steth = cv2.morphologyEx(steth, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(steth)
    keep = np.zeros_like(steth)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 40:
            keep[lab == i] = 255
    steth = keep
    chest = np.zeros((H, W), np.uint8)
    cv2.ellipse(chest, (580, 850), (32, 32), 0, 0, 360, 255, -1)
    cv2.ellipse(chest, (395, 915), (40, 16), 0, 0, 360, 255, -1)
    loop = poly([(318, 750), (402, 750), (402, 940), (318, 940)])
    silver = loop & ((s < 60) & (v < 185)).astype(np.uint8) * 255
    steth = (steth | silver | (chest & ((s < 70) | (v < 150)).astype(np.uint8) * 255)) & zone
    steth = cv2.dilate(steth, np.ones((7, 7), np.uint8)) & cv2.bitwise_not(skin)
    # Tシャツ：青い部分＋その内側の穴（プリント）
    tm = tee | (steth & tee_poly)
    tm = cv2.morphologyEx(tm, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    ff = tm.copy()
    fm = np.zeros((H + 2, W + 2), np.uint8)
    cv2.floodFill(ff, fm, (0, 0), 255)
    tee_full = (tm | cv2.bitwise_not(ff)) & tee_poly
    cloth = zone & cv2.bitwise_not(skin)
    cloth = cv2.morphologyEx(cloth, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    coat = cloth & cv2.bitwise_not(tee_full) & cv2.bitwise_not(steth)

    for name, m in [("cloth", cloth), ("coat", coat), ("tee", tee_full), ("steth", steth), ("skin", skin & zone)]:
        cv2.imwrite(str(TMP / f"m_{name}.png"), m)

    # 聴診器を消した服
    x0, y0, x1, y1 = 150, 600, 760, 1000
    plate = img.copy()
    plate[y0:y1, x0:x1] = inpaint(img[y0:y1, x0:x1], steth[y0:y1, x0:x1])
    # 聴診器を消した場所の白衣／Tシャツの割り振り
    tee_all = tee_full & cloth
    shirt_all = tee_poly & cloth
    coat_all = cloth & cv2.bitwise_not(tee_all)
    coat_s = cloth & cv2.bitwise_not(shirt_all)
    Image.fromarray(plate).save(TMP / "plate.png")

    L = cv2.cvtColor(plate, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    Lw = float(np.percentile(L[coat_all > 0], 70))
    Lt = float(np.median(L[tee_all > 0]))
    rng = np.random.default_rng(5)

    (OUT / "outfit").mkdir(exist_ok=True)
    for name, o in OUTFITS.items():
        out = plate.astype(np.float32) / 255
        alpha = cloth.copy()

        def paint(mask, color, ref, gamma=1.0, tex=None):
            c = hexrgb(color)
            f = np.clip(L / ref, 0, 1.6) ** gamma
            col = c[None, None, :] * f[..., None]
            hi = np.clip(f - 1, 0, 1)[..., None] * 0.35
            col = np.clip(col + hi, 0, 1)
            if tex is not None:
                col = np.clip(col * tex[..., None], 0, 1)
            sel = mask > 0
            out[sel] = col[sel]

        tweed = None
        if o.get("tweed"):
            noise = rng.random((H, W)).astype(np.float32)
            tweed = 0.82 + 0.36 * cv2.GaussianBlur(noise, (0, 0), 0.7)
        if o.get("knit"):
            xs = np.arange(W)[None, :].repeat(H, 0)
            tweed = 0.9 + 0.1 * np.sin(xs / 3.2)
        if o.get("vest"):
            vest = (poly([(300, 690), (394, 684), (372, 948), (276, 948)]) | poly([(498, 684), (590, 690), (626, 948), (530, 948)])) & coat_all
            cm = coat_all if o.get("keep_tee") else coat_s
            paint(cm & cv2.bitwise_not(vest), "#ffffff", Lw)
            paint(vest & cm, o["vest"], Lw, 1.1)
        elif o.get("jacket"):
            paint(coat_all if o.get("keep_tee") else coat_s, o["jacket"], Lw, 1.1, tweed)
        if o.get("keep_tee"):
            pass
        elif o.get("shirt"):
            c = hexrgb(o["shirt"])
            tm = (shirt_all > 0).astype(np.float32)
            Ls = cv2.GaussianBlur(L * tm, (0, 0), 14) / np.maximum(cv2.GaussianBlur(tm, (0, 0), 14), 1e-3)
            mu = float(Ls[shirt_all > 0].mean())
            edge = cv2.distanceTransform(shirt_all, cv2.DIST_L2, 5)
            shade_e = np.clip(edge / 14.0, 0, 1) * 0.12 + 0.88
            f = np.clip((0.95 + (Ls - mu) * 1.4) * shade_e, 0.68, 1.02)
            col = np.clip(c[None, None, :] * f[..., None], 0, 1)
            sel = shirt_all > 0
            out[sel] = col[sel]
            if o.get("check"):
                yy, xx = np.mgrid[0:H, 0:W]
                chk = (((xx // 9) % 2 == 0) | ((yy // 9) % 2 == 0)).astype(np.float32)
                sel = tee_all > 0
                out[sel] = out[sel] * (1 - 0.12 * chk[sel][:, None])
        rgba = np.dstack([np.clip(out * 255, 0, 255).astype(np.uint8), alpha])
        im = Image.fromarray(rgba, "RGBA")

        # 細部（えり・ネクタイなど）を 3倍で描いて縮める
        k = 3
        det = Image.new("RGBA", (W * k, H * k), (0, 0, 0, 0))
        d = ImageDraw.Draw(det)
        P = lambda pts: [(x * k, y * k) for x, y in pts]  # noqa: E731
        ink = (90, 61, 38, 200)
        shirt = o.get("shirt", "#ffffff")
        if o.get("shirt") and not o.get("keep_tee"):
            for pts in ([(392, 684), (446, 700), (420, 744), (382, 700)], [(502, 682), (448, 700), (476, 744), (514, 698)]):
                d.polygon(P(pts), fill=shirt, outline=ink, width=k * 2)
        if o.get("tie"):
            tc = o["tie"]
            d.polygon(P([(437, 697), (459, 697), (456, 718), (440, 718)]), fill=tc, outline=ink, width=k * 2)
            d.polygon(P([(440, 718), (456, 718), (472, 900), (448, 934), (424, 900)]), fill=tc, outline=ink, width=k * 2)
            light = tuple(int(c * 255 * 0.55 + 255 * 0.45) for c in hexrgb(tc)) + (200,)
            for yy in (760, 810, 860):
                d.line(P([(438, yy), (462, yy + 22)]), fill=light, width=k * 4)
        if o.get("bow"):
            bc = o["bow"]
            d.polygon(P([(448, 708), (412, 690), (410, 730)]), fill=bc, outline=ink, width=k * 2)
            d.polygon(P([(448, 708), (484, 690), (486, 730)]), fill=bc, outline=ink, width=k * 2)
            d.ellipse(P([(440, 700), (456, 716)]), fill=bc, outline=ink, width=k * 2)
        if o.get("scarf"):
            sc = o["scarf"]
            d.polygon(P([(380, 672), (448, 706), (520, 670), (530, 696), (448, 740), (370, 698)]), fill=sc, outline=ink, width=k * 2)
            d.polygon(P([(470, 724), (506, 714), (522, 860), (486, 866)]), fill=sc, outline=ink, width=k * 2)
            for yy in (690, 790, 830):
                d.line(P([(400 if yy < 700 else 474, yy if yy < 700 else yy), (500 if yy < 700 else 516, yy + (18 if yy < 700 else -4))]), fill=(150, 60, 60, 210), width=k * 5)
        if o.get("pocket"):
            d.polygon(P([(560, 806), (570, 786), (580, 800), (590, 782), (600, 804)]), fill=o["pocket"], outline=ink, width=k * 2)
        if o.get("buttons"):
            for yy in (790, 850, 910):
                d.ellipse(P([(520 + (yy - 790) * 0.04, yy), (534 + (yy - 790) * 0.04, yy + 14)]), fill="#9b6a2a", outline=ink, width=k * 2)
        if o.get("lanyard"):
            d.line(P([(400, 690), (560, 800)]), fill=(58, 123, 213, 255), width=k * 6)
            d.line(P([(500, 688), (560, 800)]), fill=(58, 123, 213, 255), width=k * 6)
            d.rounded_rectangle(P([(530, 798), (604, 860)]), radius=k * 6, fill="#ffffff", outline=ink, width=k * 2)
            d.rectangle(P([(540, 808), (594, 820)]), fill="#7fbf5f")
            d.line(P([(540, 834), (590, 834)]), fill=(150, 150, 150, 255), width=k * 3)
        det = det.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.5))
        im.alpha_composite(det)
        if o.get("pin"):
            try:
                pin = Image.open(f"{ROOT_EMOJI}/{o['pin']}.webp").convert("RGBA").resize((54, 54), Image.LANCZOS)
                im.alpha_composite(pin, (548, 760))
            except FileNotFoundError:
                pass
        sx0, sy0, sx1, sy1 = SCENE
        im.crop((sx0, sy0, sx1, sy1)).save(OUT / "outfit" / f"{name}.webp", "WEBP", quality=88, method=6)
        print("outfit", name)

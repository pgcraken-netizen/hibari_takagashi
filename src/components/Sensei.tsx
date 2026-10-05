"use client";

import type { Face } from "@/data/content";
import { ITEM_BY_ID } from "@/data/content";
import { HAT_BY_ID, type Hat } from "@/data/hats";
import { OUTFIT_BY_ID, type Outfit } from "@/data/outfits";
import type { Season } from "@/data/seasons";

const SKIN = "#f7d2b2";
const SKIN_SHADE = "#e9b893";
const LINE = "#5a3d2e";
const HAIR = "#2e2622";

const SEASON_JACKET: Record<Season, string> = {
  spring: "#7fae6b",
  summer: "#4a90c8",
  autumn: "#9b5a3c",
  winter: "#7a3046",
};

export function splitEmoji(s: string): string[] {
  try {
    const seg = new Intl.Segmenter("ja", { granularity: "grapheme" });
    return Array.from(seg.segment(s), (x) => x.segment);
  } catch {
    return Array.from(s);
  }
}

type Props = {
  hatId: string;
  outfitId: string;
  itemId: string;
  face?: Face;
  season?: Season;
  className?: string;
  title?: string;
};

export default function Sensei({ hatId, outfitId, itemId, face = "smile", season = "spring", className, title }: Props) {
  const hat = HAT_BY_ID[hatId];
  const outfit = OUTFIT_BY_ID[outfitId] ?? OUTFIT_BY_ID["outfit_001"];
  const item = ITEM_BY_ID[itemId];
  const o: Outfit = outfit.id === "outfit_010" ? { ...outfit, jacket: SEASON_JACKET[season] } : outfit;

  return (
    <svg viewBox="0 -40 300 430" className={className} role="img" aria-label={title ?? "高橋先生"}>
      <Body o={o} />
      {/* 首 */}
      <path d="M128 236 L172 236 L170 276 Q150 286 130 276 Z" fill={SKIN_SHADE} />
      <HeadAndFace face={face} />
      {hat && <HatLayer hat={hat} />}
      {item && item.id !== "item_none" && <HandItem emoji={item.emoji} />}
    </svg>
  );
}

/* ---------------- 体と衣装 ---------------- */

function Body({ o }: { o: Outfit }) {
  const torso = "M30 392 C30 316 70 278 150 272 C230 278 270 316 270 392 Z";
  const jacket = o.jacket ?? o.shirt;
  const darker = shade(jacket, -0.18);
  return (
    <g>
      {/* 上着（またはシャツ） */}
      <path d={torso} fill={o.jacketStyle === "vest" ? o.shirt : jacket} stroke={LINE} strokeWidth="3" />
      {o.pattern === "tweed" && (
        <g opacity="0.18" fill="#fff">
          {Array.from({ length: 70 }).map((_, i) => (
            <circle key={i} cx={40 + ((i * 37) % 220)} cy={290 + ((i * 53) % 100)} r="1.6" />
          ))}
        </g>
      )}

      {/* ベスト */}
      {o.jacketStyle === "vest" && (
        <path d="M78 300 C100 284 120 278 150 276 C180 278 200 284 222 300 L230 392 L70 392 Z" fill={jacket} stroke={LINE} strokeWidth="3" />
      )}

      {/* シャツのえり（V） */}
      <path d="M118 276 L150 346 L182 276 Q150 268 118 276 Z" fill={o.shirt} stroke={LINE} strokeWidth="2.5" />
      {/* えり先 */}
      <path d="M118 276 L134 300 L150 282 Z" fill={o.shirt} stroke={LINE} strokeWidth="2" />
      <path d="M182 276 L166 300 L150 282 Z" fill={o.shirt} stroke={LINE} strokeWidth="2" />

      {/* ネクタイ */}
      {o.tie && (
        <g stroke={LINE} strokeWidth="2">
          <path d="M143 286 L157 286 L154 296 L146 296 Z" fill={o.tie} />
          <path d="M146 296 L154 296 L162 350 L150 362 L138 350 Z" fill={o.tie} />
          <path d="M146 312 L158 324" stroke={shade(o.tie, 0.35)} strokeWidth="3" />
          <path d="M143 334 L160 348" stroke={shade(o.tie, 0.35)} strokeWidth="3" />
        </g>
      )}
      {/* 蝶ネクタイ */}
      {o.bow && (
        <g stroke={LINE} strokeWidth="2" fill={o.bow}>
          <path d="M150 290 L128 278 L128 302 Z" />
          <path d="M150 290 L172 278 L172 302 Z" />
          <circle cx="150" cy="290" r="6" />
        </g>
      )}

      {/* ジャケットのえり */}
      {(o.jacketStyle === "suit" || o.jacketStyle === "coat") && (
        <g fill={o.jacketStyle === "coat" ? "#f1f3f6" : darker} stroke={LINE} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M112 280 L150 372 L128 392 L104 330 L116 318 L98 300 Z" />
          <path d="M188 280 L150 372 L172 392 L196 330 L184 318 L202 300 Z" />
        </g>
      )}
      {/* カーディガン */}
      {o.jacketStyle === "cardigan" && (
        <g>
          <path d="M112 280 L150 372 M188 280 L150 372" stroke={darker} strokeWidth="10" strokeLinecap="round" />
          {[318, 342, 366].map((y) => (
            <circle key={y} cx={150 + (y - 318) * 0.02} cy={y + 4} r="4" fill={darker} stroke={LINE} strokeWidth="1.5" />
          ))}
        </g>
      )}
      {o.jacketStyle === "coat" && (
        <g fill="none" stroke={LINE} strokeWidth="2">
          <path d="M70 392 L72 340" />
          <path d="M230 392 L228 340" />
        </g>
      )}

      {/* 聴診器 */}
      {o.stethoscope && (
        <g fill="none" stroke="#2d6f9e" strokeWidth="5" strokeLinecap="round">
          <path d="M112 282 C96 320 104 350 126 356" />
          <path d="M188 282 C204 320 196 350 174 356 C164 356 160 352 160 344" />
          <circle cx="160" cy="336" r="9" fill="#cfd8e0" stroke="#5b6b78" strokeWidth="3" />
        </g>
      )}

      {/* むねの飾り */}
      {o.badge && (
        <text x="92" y="346" fontSize="26" textAnchor="middle" dominantBaseline="middle">
          {o.badge}
        </text>
      )}
    </g>
  );
}

/* ---------------- 顔 ---------------- */

function HeadAndFace({ face }: { face: Face }) {
  return (
    <g>
      {/* 耳 */}
      <ellipse cx="80" cy="186" rx="14" ry="18" fill={SKIN} stroke={LINE} strokeWidth="3" />
      <ellipse cx="220" cy="186" rx="14" ry="18" fill={SKIN} stroke={LINE} strokeWidth="3" />
      {/* 頭 */}
      <path
        d="M150 98 C196 98 222 130 222 178 C222 226 192 252 150 252 C108 252 78 226 78 178 C78 130 104 98 150 98 Z"
        fill={SKIN}
        stroke={LINE}
        strokeWidth="3"
      />
      {/* 髪（横と前） */}
      <path
        d="M80 182 C74 132 104 100 150 100 C198 100 228 132 220 182 C214 160 210 146 204 140 C190 132 176 128 162 130 C140 124 116 128 98 140 C90 150 84 164 80 182 Z"
        fill={HAIR}
      />
      <path d="M84 180 L86 196 L92 196 L92 172 Z M216 180 L214 196 L208 196 L208 172 Z" fill={HAIR} />

      {/* まゆ */}
      <Brows face={face} />
      {/* 目 */}
      <Eyes face={face} />
      {/* 鼻 */}
      <path d="M150 182 C146 194 144 200 150 204 C154 205 157 203 158 201" fill="none" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" />
      {/* ほっぺ */}
      <ellipse cx="108" cy="208" rx="13" ry="8" fill="#f4a3a0" opacity="0.55" />
      <ellipse cx="192" cy="208" rx="13" ry="8" fill="#f4a3a0" opacity="0.55" />
      {/* 口 */}
      <Mouth face={face} />
      {/* 笑いじわ */}
      {(face === "smile" || face === "happy" || face === "proud") && (
        <g stroke={LINE} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6">
          <path d="M96 172 l-8 -3 M96 178 l-9 1" />
          <path d="M204 172 l8 -3 M204 178 l9 1" />
        </g>
      )}
      {face === "sleepy" && (
        <text x="238" y="132" fontSize="22" fill="#6a7fb5" fontWeight="bold">
          Zzz
        </text>
      )}
      {face === "tired" && (
        <path d="M214 140 c6 8 6 14 0 18 c-6 -4 -6 -10 0 -18 Z" fill="#8cc8ef" stroke="#4d8fbf" strokeWidth="1.5" />
      )}
    </g>
  );
}

function Brows({ face }: { face: Face }) {
  const up = face === "surprise" ? -8 : face === "tired" ? 4 : 0;
  const tilt = face === "tired" ? 5 : 0;
  return (
    <g stroke={HAIR} strokeWidth="5" strokeLinecap="round" fill="none">
      <path d={`M104 ${152 + up + tilt} Q118 ${144 + up} 132 ${150 + up}`} />
      <path d={`M168 ${150 + up} Q182 ${144 + up} 196 ${152 + up + tilt}`} />
    </g>
  );
}

function Eyes({ face }: { face: Face }) {
  const L = 118,
    R = 182,
    Y = 172;
  switch (face) {
    case "smile":
    case "happy":
    case "yummy":
      return (
        <g stroke={LINE} strokeWidth="4" fill="none" strokeLinecap="round">
          <path d={`M${L - 12} ${Y + 3} Q${L} ${Y - 9} ${L + 12} ${Y + 3}`} />
          <path d={`M${R - 12} ${Y + 3} Q${R} ${Y - 9} ${R + 12} ${Y + 3}`} />
        </g>
      );
    case "surprise":
      return (
        <g>
          <circle cx={L} cy={Y} r="9" fill="#fff" stroke={LINE} strokeWidth="3" />
          <circle cx={R} cy={Y} r="9" fill="#fff" stroke={LINE} strokeWidth="3" />
          <circle cx={L} cy={Y} r="4.5" fill={LINE} />
          <circle cx={R} cy={Y} r="4.5" fill={LINE} />
        </g>
      );
    case "sleepy":
      return (
        <g stroke={LINE} strokeWidth="4" fill="none" strokeLinecap="round">
          <path d={`M${L - 11} ${Y + 2} Q${L} ${Y + 8} ${L + 11} ${Y + 2}`} />
          <path d={`M${R - 11} ${Y + 2} Q${R} ${Y + 8} ${R + 11} ${Y + 2}`} />
        </g>
      );
    case "tired":
      return (
        <g stroke={LINE} strokeWidth="4" fill="none" strokeLinecap="round">
          <path d={`M${L - 10} ${Y} L${L + 10} ${Y + 4}`} />
          <path d={`M${R - 10} ${Y + 4} L${R + 10} ${Y}`} />
        </g>
      );
    case "proud":
      return (
        <g>
          <path d={`M${L - 12} ${Y + 3} Q${L} ${Y - 9} ${L + 12} ${Y + 3}`} stroke={LINE} strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx={R} cy={Y} rx="5.5" ry="7" fill={LINE} />
          <circle cx={R + 2} cy={Y - 3} r="2" fill="#fff" />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={L} cy={Y} rx="5.5" ry="7" fill={LINE} />
          <ellipse cx={R} cy={Y} rx="5.5" ry="7" fill={LINE} />
          <circle cx={L + 2} cy={Y - 3} r="2" fill="#fff" />
          <circle cx={R + 2} cy={Y - 3} r="2" fill="#fff" />
        </g>
      );
  }
}

function Mouth({ face }: { face: Face }) {
  switch (face) {
    case "smile":
      return (
        <g stroke={LINE} strokeWidth="3" strokeLinejoin="round">
          <path d="M118 214 Q150 224 182 214 Q178 244 150 246 Q122 244 118 214 Z" fill="#a8423f" />
          <path d="M121 216 Q150 226 179 216 L177 225 Q150 232 123 225 Z" fill="#fff" strokeWidth="1.5" />
        </g>
      );
    case "happy":
      return (
        <g stroke={LINE} strokeWidth="3" strokeLinejoin="round">
          <path d="M112 210 Q150 222 188 210 Q184 252 150 254 Q116 252 112 210 Z" fill="#a8423f" />
          <path d="M116 212 Q150 224 184 212 L182 222 Q150 230 118 222 Z" fill="#fff" strokeWidth="1.5" />
          <path d="M132 244 Q150 232 168 244 Q150 254 132 244 Z" fill="#ef8a8a" strokeWidth="1.5" />
        </g>
      );
    case "surprise":
      return <ellipse cx="150" cy="226" rx="11" ry="14" fill="#a8423f" stroke={LINE} strokeWidth="3" />;
    case "yummy":
      return (
        <g>
          <path d="M126 220 Q150 236 174 220" fill="none" stroke={LINE} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="180" cy="222" rx="10" ry="8" fill={SKIN_SHADE} />
          <path d="M150 228 q4 10 10 4" fill="#ef8a8a" stroke={LINE} strokeWidth="2" />
        </g>
      );
    case "tired":
      return <path d="M128 228 q8 -6 16 0 t16 0 t16 0" fill="none" stroke={LINE} strokeWidth="3.5" strokeLinecap="round" />;
    case "sleepy":
      return <ellipse cx="150" cy="228" rx="7" ry="8" fill="#a8423f" stroke={LINE} strokeWidth="3" />;
    case "proud":
      return <path d="M126 220 Q156 236 180 214" fill="none" stroke={LINE} strokeWidth="4" strokeLinecap="round" />;
    default:
      return <path d="M128 220 Q150 236 172 220" fill="none" stroke={LINE} strokeWidth="4" strokeLinecap="round" />;
  }
}

/* ---------------- 帽子 ---------------- */

function FeltCap({ color }: { color: string }) {
  return (
    <g stroke={LINE} strokeWidth="3" strokeLinejoin="round">
      <path d="M74 140 C70 82 110 66 150 66 C192 66 232 82 226 140 Q150 128 74 140 Z" fill={color} />
      <path d="M100 82 Q150 74 200 82" fill="none" stroke={shade(color, -0.2)} strokeWidth="2" strokeDasharray="4 5" />
      <path d="M62 142 Q150 122 238 142 Q232 160 150 158 Q68 160 62 142 Z" fill={shade(color, -0.15)} />
    </g>
  );
}

function HatLayer({ hat }: { hat: Hat }) {
  const parts = splitEmoji(hat.emoji);
  const em = (e: string, x: number, y: number, size: number, rot = 0, key?: string | number) => (
    <text
      key={key}
      x={x}
      y={y}
      fontSize={size}
      textAnchor="middle"
      dominantBaseline="central"
      transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
      style={{ fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}
    >
      {e}
    </text>
  );

  switch (hat.style) {
    case "cap":
      return (
        <g className="hat">
          <FeltCap color={hat.capColor ?? "#a07a52"} />
          {em(parts[0], 150, 74, 66)}
          {parts.slice(1).map((p, i) => em(p, i === 0 ? 206 : 94, 104, 34, 0, i))}
        </g>
      );
    case "trio":
      return (
        <g className="hat">
          <FeltCap color={hat.capColor ?? "#a07a52"} />
          {em(parts[1] ?? parts[0], 150, 72, 52, 0, "c")}
          {em(parts[0], 92, 108, 50, -14, "l")}
          {em(parts[2] ?? parts[0], 208, 108, 50, 14, "r")}
        </g>
      );
    case "tall":
      return (
        <g className="hat">
          {em(parts[0], 150, 46, 128)}
          {parts.slice(1).map((p, i) => em(p, 214, 90, 36, 0, i))}
        </g>
      );
    case "big":
    default: {
      // 2つ目が「羽」なら左右に
      if (parts[1] === "🪽") {
        return (
          <g className="hat">
            {em("🪽", 72, 86, 52, 0, "wl")}
            <g transform="translate(228 86) scale(-1 1) translate(-228 -86)">{em("🪽", 228, 86, 52, 0, "wr")}</g>
            {em(parts[0], 150, 84, 120)}
          </g>
        );
      }
      return (
        <g className="hat">
          {em(parts[0], 150, 82, 124)}
          {parts.slice(1).map((p, i) => em(p, i === 0 ? 218 : 82, 112, 40, 0, i))}
        </g>
      );
    }
  }
}

/* ---------------- 手と小物 ---------------- */

function HandItem({ emoji }: { emoji: string }) {
  return (
    <g>
      <text
        x="236"
        y="300"
        fontSize="58"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}
      >
        {emoji}
      </text>
      <circle cx="232" cy="338" r="16" fill={SKIN} stroke={LINE} strokeWidth="3" />
      <path d="M222 334 q10 -6 20 0" fill="none" stroke={LINE} strokeWidth="2" />
    </g>
  );
}

/* ---------------- util ---------------- */

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  r = f(r);
  g = f(g);
  b = f(b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

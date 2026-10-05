// 絵（public/art）のパス
import type { Face } from "@/data/content";
import { SEASONS, SEASON_ORDER, type Season } from "@/data/seasons";

export const emojiKey = (e: string) =>
  Array.from(e)
    .filter((c) => c.codePointAt(0) !== 0xfe0f)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-");

export const emojiSrc = (e: string) => `/art/emoji/${emojiKey(e)}.webp`;
export const hatSrc = (id: string) => `/art/hat3d/${id}.webp`;
export const outfitSrc = (id: string, season: Season) =>
  id === "outfit_010" ? `/art/home/outfit/outfit_010_${season}.webp` : `/art/home/outfit/${id}.webp`;
/** 参考画像から切り出した料理（絵のタッチが部屋とそろう） */
const PAINTED_FOODS = new Set(["dango", "ichigo", "cake"]);
export const foodSrc = (art: string) => (PAINTED_FOODS.has(art) ? `/art/home/food-${art}.webp` : `/art/food/${art}.webp`);
export const roomSrc = (s: Season) => `/art/home/room-${s}.webp`;

export type Food = { emoji: string; name: string; art: string; season: Season };
export const ALL_FOODS: Food[] = SEASON_ORDER.flatMap((s) => SEASONS[s].table.map((f) => ({ ...f, season: s })));

/** 表情のかわりに、先生のまわりに出るエフェクト */
export const FACE_FX: Record<Face, string[]> = {
  normal: [],
  smile: ["✨"],
  surprise: ["❗"],
  happy: ["💕", "✨"],
  yummy: ["😋", "💕"],
  tired: ["💦"],
  sleepy: ["💤"],
  proud: ["✨", "👍"],
};

/* ---------- 参考画像の座標（941 × 1672） ---------- */
export const REF_W = 941;
export const SCENE = { x: 0, y: 110, w: 941, h: 972 };
/** キービジュアルの帽子座標 → 部屋の座標 */
export const HAT_MATRIX = [0.8149872988992378, -0.04191363251481793, 0.04191363251481793, 0.8149872988992378, 42.693056731583454, -21.412785774767144] as const;
export const HAT_BOX = { x: 250, y: 330, w: 460, h: 370 };
/** テーブルの3つの席（お皿の位置） */
export const FOOD_SLOTS = [
  { x: 322, y: 938, w: 196, h: 92 },
  { x: 560, y: 925, w: 174, h: 139 },
  { x: 480, y: 984, w: 112, h: 96 },
];
export const MOUTH = { x: 453, y: 611 };

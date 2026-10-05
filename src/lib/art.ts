// 絵（public/art）のパスと、画面で使う絵文字アイコン
// ※ 絵は scripts/art/ のスタジオで描いて書き出しています（README参照）
import type { Face } from "@/data/content";
import { SEASONS, SEASON_ORDER, type Season } from "@/data/seasons";

export const emojiKey = (e: string) =>
  Array.from(e)
    .filter((c) => c.codePointAt(0) !== 0xfe0f)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-");

export const emojiSrc = (e: string) => `/art/emoji/${emojiKey(e)}.webp`;
export const hatSrc = (id: string) => `/art/hat/${id}.webp`;
export const outfitSrc = (id: string, season: Season) =>
  id === "outfit_010" ? `/art/outfit/outfit_010_${season}.webp` : `/art/outfit/${id}.webp`;
export const foodSrc = (art: string) => `/art/food/${art}.webp`;
export const roomSrc = (s: Season) => `/art/room-${s}.webp`;

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

/** 画面のアイコン */
export const ICON = {
  home: "🏠",
  room: "🏡",
  kisekae: "🎩",
  zukan: "📖",
  cards: "🃏",
  kisetsu: "🌸",
  gohan: "🍙",
  omakase: "⭐",
  settings: "⚙️",
  about: "👨‍⚕️",
  again: "🔁",
  speaker: "🔊",
  heart: "💛",
  gift: "🎁",
  camera: "📸",
  sparkle: "✨",
  hat: "👒",
  shirt: "👔",
  balloon: "🎈",
  back: "⬅️",
  lock: "🔒",
  book: "📕",
  sprout: "🌱",
  question: "❓",
  ok: "⭕",
};

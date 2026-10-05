"use client";

import { HATS } from "@/data/hats";
import { OUTFITS } from "@/data/outfits";
import { ITEMS, MESSAGES } from "@/data/content";

/* ---------- 乱数 ---------- */

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(arr: T[], rnd: () => number = Math.random): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/* ---------- 保存データ（端末の中だけ） ---------- */

export type Settings = {
  voice: boolean;
  sfx: boolean;
  bgm: boolean;
  vibration: boolean;
  animation: boolean;
  bigText: boolean;
  voiceMode: boolean; // 音声であそぶ
  bubble: boolean; // ふきだし
};

export type Snap = Look & { season: string; date: string };

export type Look = {
  hat: string;
  outfit: string;
  item: string;
};

export type SaveData = {
  version: 1;
  found: string[]; // 見つけた帽子
  favorites: string[];
  seenCards: string[];
  lastDay: string;
  todayLook: Look | null;
  look: Look;
  omakaseCount: number;
  sinceNew: number; // 新しい帽子が出てからの回数（救済用）
  foodTaps: number;
  album: Snap[];
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  voice: true,
  sfx: true,
  bgm: false,
  vibration: true,
  animation: true,
  bigText: false,
  voiceMode: false,
  bubble: true,
};

const KEY = "takahashi-sensei-asobou-v1";

export function defaultSave(): SaveData {
  return {
    version: 1,
    found: [],
    favorites: [],
    seenCards: [],
    lastDay: "",
    todayLook: null,
    look: { hat: HATS[0].id, outfit: OUTFITS[0].id, item: ITEMS[0].id },
    omakaseCount: 0,
    sinceNew: 0,
    foodTaps: 0,
    album: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const d = defaultSave();
      if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        d.settings.animation = false;
      }
      return d;
    }
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const d = defaultSave();
    return { ...d, ...parsed, settings: { ...d.settings, ...(parsed.settings ?? {}) } };
  } catch {
    return defaultSave();
  }
}

export function writeSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 保存できない環境でも遊べるようにする */
  }
}

/* ---------- 帽子の出し方（ガチャにしない・救済つき） ---------- */

/**
 * 新しい帽子を返す（まだ見つけていない中から）。季節に合うものを少し優先。
 */
export function pickNewHat(found: Set<string>, season: string, rnd = Math.random): string | null {
  const notFound = HATS.filter((h) => !found.has(h.id));
  if (notFound.length === 0) return null;
  const seasonal = notFound.filter((h) => h.season?.includes(season as never));
  // やさしい帽子（★が少ない）ほど出やすい。でもレアも普通に出る。
  const pool = seasonal.length > 0 && rnd() < 0.5 ? seasonal : notFound;
  const weighted = pool.flatMap((h) => Array(6 - h.rarity).fill(h.id) as string[]);
  return pick(weighted, rnd);
}

/**
 * おまかせ：基本はランダムで、3回に1回は必ず新しい帽子（救済）。
 */
export function omakaseHat(found: Set<string>, sinceNew: number, season: string): { hat: string; isNew: boolean } {
  const forceNew = sinceNew >= 2;
  if (forceNew || Math.random() < 0.35) {
    const n = pickNewHat(found, season);
    if (n) return { hat: n, isNew: true };
  }
  const h = pick(HATS).id;
  return { hat: h, isNew: !found.has(h) };
}

export function randomLookParts() {
  return {
    outfit: pick(OUTFITS).id,
    item: pick(ITEMS.slice(1)).id,
    message: pick(MESSAGES),
  };
}

export function dailyMessage(day: string): string {
  const rnd = seededRandom(hashString("msg" + day));
  return pick(MESSAGES, rnd);
}

/* eslint-disable @next/next/no-img-element */
"use client";

import SenseiArt from "./SenseiArt";
import type { Face } from "@/data/content";
import type { Season } from "@/data/seasons";
import type { Look } from "@/lib/game";
import { foodSrc, roomSrc, type Food } from "@/lib/art";

/*
 * 先生のへや（部屋の絵 → 先生 → テーブル → ごはん → ふきだし）
 * 座標は 400×540 の「シーン単位」
 */
const W = 400;
const H = 540;
const px = (v: number) => `${(v / W) * 100}%`;
const py = (v: number) => `${(v / H) * 100}%`;

const SENSEI = { x: 25, y: 58, w: 330 };
const FOOD_SLOTS = [70, 200, 330];
const MOUTH = { x: 200, y: 300 };

type Props = {
  look: Look;
  season: Season;
  face: Face;
  bubble: string | null;
  motion: string;
  motionKey: number;
  foods?: Food[];
  eating?: { slot: number; key: number } | null;
  mode?: "full" | "upper";
  onTapSensei?: () => void;
  onTapFood?: (slot: number) => void;
};

export default function Room({ look, season, face, bubble, motion, motionKey, foods = [], eating, mode = "full", onTapSensei, onTapFood }: Props) {
  const y0 = mode === "upper" ? 44 : 0;
  const y1 = mode === "upper" ? 344 : H;
  const vh = y1 - y0;
  return (
    <div className="scene relative w-full overflow-hidden" style={{ aspectRatio: `${W} / ${vh}` }}>
      <div className="absolute inset-x-0" style={{ top: `${(-y0 / vh) * 100}%`, height: `${(H / vh) * 100}%` }}>
        {/* 部屋 */}
        <img src={roomSrc(season)} alt="" draggable={false} className="absolute left-0 top-0 w-full" style={{ height: py(500) }} />

        {/* 先生 */}
        <button
          type="button"
          onClick={onTapSensei}
          aria-label="先生をタップ"
          className="tile absolute"
          style={{ left: px(SENSEI.x), top: py(SENSEI.y), width: px(SENSEI.w) }}
        >
          <SenseiArt hat={look.hat} outfit={look.outfit} item={look.item} season={season} face={face} motion={motion} motionKey={motionKey} />
        </button>

        {/* テーブル */}
        {mode === "full" && (
          <>
            <img src="/art/table.webp" alt="" draggable={false} className="pointer-events-none absolute left-0 w-full" style={{ top: py(372), height: py(170) }} />
            {foods.slice(0, 3).map((f, i) => (
              <button
                key={`${f.art}-${i}`}
                type="button"
                onClick={() => onTapFood?.(i)}
                aria-label={`${f.name}をたべる`}
                className="tile food absolute"
                style={{ left: px(FOOD_SLOTS[i] - 60), top: py(352), width: px(120) }}
              >
                <img src={foodSrc(f.art)} alt="" draggable={false} className={`w-full ${eating?.slot === i ? "food-wiggle" : ""}`} key={eating?.slot === i ? eating.key : 0} />
                <span className="food-label">{f.name}</span>
              </button>
            ))}
            {eating && foods[eating.slot] && (
              <img
                key={`fly${eating.key}`}
                src={foodSrc(foods[eating.slot].art)}
                alt=""
                className="pointer-events-none absolute fly-to-mouth"
                style={
                  {
                    left: px(FOOD_SLOTS[eating.slot] - 30),
                    top: py(370),
                    width: px(60),
                    "--dx": `${((MOUTH.x - FOOD_SLOTS[eating.slot]) / 60) * 100}%`,
                    "--dy": `${((MOUTH.y - 400) / 50) * 100}%`,
                  } as React.CSSProperties
                }
              />
            )}
          </>
        )}
      </div>

      {/* ふきだし */}
      {bubble && (
        <div key={bubble + motionKey} className={`bubble pop-in ${mode === "upper" ? "bubble-low" : ""}`} role="status" aria-live="polite">
          {bubble}
        </div>
      )}

      {/* 紙の質感 */}
      <div className="paper-overlay pointer-events-none absolute inset-0" />
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
"use client";

import { ITEM_BY_ID, type Face } from "@/data/content";
import { HAT_BY_ID } from "@/data/hats";
import type { Season } from "@/data/seasons";
import { FACE_FX, FOOD_SLOTS, HAT_BOX, HAT_MATRIX, MOUTH, SCENE, emojiSrc, foodSrc, hatSrc, outfitSrc, roomSrc, type Food } from "@/lib/art";
import type { Look } from "@/lib/game";

/*
 * 先生のへや（参考画像の部屋に、先生・衣装・帽子・テーブル・ごはんを重ねる）
 * 座標はすべて参考画像（941×1672）の座標。
 */

export type View = { y0: number; y1: number };
export const FULL_VIEW: View = { y0: SCENE.y, y1: SCENE.y + SCENE.h };

type Props = {
  look: Look;
  season: Season;
  face?: Face;
  motion?: string;
  motionKey?: number;
  foods?: Food[];
  eating?: { slot: number; key: number } | null;
  view?: View;
  onTapSensei?: () => void;
  onTapFood?: (slot: number) => void;
  children?: React.ReactNode; // 上にのせる HTML（％で配置）
  className?: string;
  showFx?: boolean;
};

const MTX = `matrix(${HAT_MATRIX.join(" ")})`;

export default function Scene({ look, season, face = "smile", motion = "", motionKey = 0, foods, eating, view = FULL_VIEW, onTapSensei, onTapFood, children, className = "", showFx = true }: Props) {
  const it = look.item ? ITEM_BY_ID[look.item] : null;
  const hat = look.hat && HAT_BY_ID[look.hat] ? look.hat : null;
  const fx = showFx ? FACE_FX[face] : [];
  const vh = view.y1 - view.y0;
  return (
    <div className={`scene2 relative w-full overflow-hidden ${className}`} style={{ aspectRatio: `941 / ${vh}` }}>
      <svg viewBox={`0 ${view.y0} 941 ${vh}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMin slice">
        <defs>
          <filter id="hatShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#4a2a12" floodOpacity="0.38" />
          </filter>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#4a2a12" floodOpacity="0.3" />
          </filter>
        </defs>
        <image href={roomSrc(season)} x={SCENE.x} y={SCENE.y} width={SCENE.w} height={SCENE.h} />

        <g className="sensei-bob">
          <g key={motionKey} className={`sensei-g ${motion}`} onClick={onTapSensei} style={{ cursor: onTapSensei ? "pointer" : undefined }}>
            <image href="/art/home/sensei.webp" x={SCENE.x} y={SCENE.y} width={SCENE.w} height={SCENE.h} />
            {look.outfit !== "outfit_008" && <image href={outfitSrc(look.outfit, season)} x={SCENE.x} y={SCENE.y} width={SCENE.w} height={SCENE.h} />}
            {hat && (
              <g transform={MTX}>
                <image href={hatSrc(hat)} x={HAT_BOX.x} y={HAT_BOX.y} width={HAT_BOX.w} height={HAT_BOX.h} filter="url(#hatShadow)" />
              </g>
            )}
            {it && it.id !== "item_none" && <image key={it.id} href={emojiSrc(it.emoji)} x={600} y={700} width={120} height={120} className="item-sway2" filter="url(#softShadow)" />}
          </g>
        </g>

        {fx.map((e, i) => (
          <image key={`${motionKey}-${i}`} href={emojiSrc(e)} x={i === 0 ? 600 : 268} y={i === 0 ? 420 : 470} width={i === 0 ? 86 : 70} height={i === 0 ? 86 : 70} className="fx-pop2" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}

        <image href="/art/home/table.webp" x={SCENE.x} y={SCENE.y} width={SCENE.w} height={SCENE.h} style={{ pointerEvents: "none" }} />

        {foods?.slice(0, 3).map((f, i) => {
          const s = FOOD_SLOTS[i];
          const painted = ["dango", "ichigo", "cake"].includes(f.art);
          // クレヨンの絵は 240×200 の中に料理が描いてあるので、少し大きめにおく
          const w = painted ? s.w : s.w * 1.25;
          const h = painted ? s.h : w * (200 / 240);
          const x = s.x + s.w / 2 - w / 2;
          const y = s.y + s.h - h + (painted ? 0 : h * 0.06);
          const eatingThis = eating?.slot === i;
          return (
            <g key={`${f.art}-${i}`} onClick={() => onTapFood?.(i)} style={{ cursor: "pointer" }} className={eatingThis ? "food-wiggle2" : ""}>
              <rect x={x} y={y} width={w} height={h} fill="transparent" />
              <image href={foodSrc(f.art)} x={x} y={y} width={w} height={h} />
            </g>
          );
        })}
        {eating && foods?.[eating.slot] && (
          <image
            key={`fly${eating.key}`}
            href={foodSrc(foods[eating.slot].art)}
            x={FOOD_SLOTS[eating.slot].x + FOOD_SLOTS[eating.slot].w / 2 - 40}
            y={FOOD_SLOTS[eating.slot].y}
            width={80}
            height={60}
            className="fly2"
            style={
              {
                "--dx": `${MOUTH.x - (FOOD_SLOTS[eating.slot].x + FOOD_SLOTS[eating.slot].w / 2)}px`,
                "--dy": `${MOUTH.y - FOOD_SLOTS[eating.slot].y - 20}px`,
              } as React.CSSProperties
            }
          />
        )}
      </svg>
      {children}
    </div>
  );
}

/** 参考画像の座標 → シーン内の％ */
export function at(view: View, x: number, y: number, w?: number, h?: number): React.CSSProperties {
  const vh = view.y1 - view.y0;
  return {
    position: "absolute",
    left: `${(x / 941) * 100}%`,
    top: `${((y - view.y0) / vh) * 100}%`,
    ...(w !== undefined ? { width: `${(w / 941) * 100}%` } : {}),
    ...(h !== undefined ? { height: `${(h / vh) * 100}%` } : {}),
  };
}

/** 帽子をかぶった先生の顔（サムネイル） */
export function HatFace({ hat, className = "" }: { hat: string | null; className?: string }) {
  return (
    <svg viewBox="262 222 426 426" className={className} aria-hidden>
      <image href="/art/home/face.webp" x={250} y={300} width={450} height={400} />
      {hat && (
        <g transform={MTX}>
          <image href={hatSrc(hat)} x={HAT_BOX.x} y={HAT_BOX.y} width={HAT_BOX.w} height={HAT_BOX.h} />
        </g>
      )}
    </svg>
  );
}

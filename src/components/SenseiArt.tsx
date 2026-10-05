/* eslint-disable @next/next/no-img-element */
"use client";

import { HAT_BY_ID } from "@/data/hats";
import { ITEM_BY_ID, type Face } from "@/data/content";
import type { Season } from "@/data/seasons";
import { FACE_FX, emojiSrc, hatSrc, outfitSrc } from "@/lib/art";

/*
 * 高橋先生（キービジュアルから切り出した顔と手 ＋ 描いた衣装 ＋ 帽子）
 * 座標フレーム：キービジュアルの x130..790, y330..1050（660×720）
 */
const pct = (v: number, total: number) => `${(v / total) * 100}%`;
const FX = (x: number) => pct(x - 130, 660);
const FY = (y: number) => pct(y - 330, 720);

type Props = {
  hat: string | null;
  outfit: string;
  item?: string;
  season: Season;
  face?: Face;
  motion?: string;
  motionKey?: number;
  className?: string;
  showFx?: boolean;
};

export default function SenseiArt({ hat, outfit, item, season, face = "smile", motion = "", motionKey = 0, className = "", showFx = true }: Props) {
  const it = item ? ITEM_BY_ID[item] : null;
  const fx = showFx ? FACE_FX[face] : [];
  const hatOk = hat && HAT_BY_ID[hat];
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: "660 / 720" }}>
      <div className="absolute inset-0 bob">
        {/* 頭＋帽子（首のところを支点にゆれる） */}
        <div key={`h${motionKey}`} className={`absolute inset-0 head ${motion}`} style={{ transformOrigin: "49.7% 79%" }}>
          <img src="/art/sensei-head.webp" alt="" draggable={false} className="absolute inset-0 h-full w-full" />
          {hatOk && (
            <img
              src={hatSrc(hat!)}
              alt=""
              draggable={false}
              className="absolute"
              style={{ left: FX(250), top: FY(330), width: pct(460, 660) }}
            />
          )}
        </div>
        <img src={outfitSrc(outfit, season)} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
        <div key={`a${motionKey}`} className={`absolute inset-0 hand ${motion}`} style={{ transformOrigin: "25% 100%" }}>
          <img src="/art/sensei-hand.webp" alt="" draggable={false} className="absolute inset-0 h-full w-full" />
        </div>
        {it && it.id !== "item_none" && (
          <img
            key={`i${it.id}`}
            src={emojiSrc(it.emoji)}
            alt=""
            draggable={false}
            className="absolute pop-in item-sway"
            style={{ left: FX(640), top: FY(840), width: pct(150, 660) }}
          />
        )}
        {fx.map((e, i) => (
          <img
            key={`${motionKey}-${i}`}
            src={emojiSrc(e)}
            alt=""
            className="absolute fx-pop"
            style={{ left: FX(i === 0 ? 650 : 250), top: FY(i === 0 ? 560 : 610), width: pct(i === 0 ? 96 : 80, 660), animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import Sensei from "./Sensei";
import { SEASONS, type Season } from "@/data/seasons";
import type { Face } from "@/data/content";
import type { Look } from "@/lib/game";

type Props = {
  look: Look;
  face: Face;
  season: Season;
  bubble: string | null;
  motion: string; // bob / hop / wiggle / chew / shuffle
  motionKey: number;
  onTapSensei?: () => void;
  onTapFood?: (name: string) => void;
  compact?: boolean;
  showTable?: boolean;
};

export default function Stage({ look, face, season, bubble, motion, motionKey, onTapSensei, onTapFood, compact, showTable = true }: Props) {
  const s = SEASONS[season];
  return (
    <div
      className="crayon relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${s.skyTop} 0%, ${s.skyBottom} 70%)`,
        height: compact ? 250 : 470,
      }}
    >
      {/* おひさま・くも */}
      <div className="emoji absolute left-3 top-2 text-5xl" aria-hidden>
        {season === "winter" ? "🌤️" : "☀️"}
      </div>
      <div className="emoji drift absolute right-6 top-4 text-4xl opacity-90" aria-hidden>
        ☁️
      </div>
      {season === "summer" && !compact && (
        <div className="emoji absolute right-3 top-20 text-3xl" aria-hidden>
          🌈
        </div>
      )}

      {/* ふわふわ落ちてくる季節のもの（点滅なし・ゆっくり） */}
      {s.floaters.map((f, i) => (
        <span
          key={i}
          aria-hidden
          className="emoji floater pointer-events-none absolute top-0 text-2xl"
          style={{ left: `${10 + i * 22}%`, animationDuration: `${9 + i * 2.5}s`, animationDelay: `${i * 1.7}s` }}
        >
          {f}
        </span>
      ))}

      {/* 地面 */}
      <svg className="absolute inset-x-0 bottom-0 w-full" viewBox="0 0 400 120" preserveAspectRatio="none" style={{ height: compact ? 70 : 110 }} aria-hidden>
        <path d="M0 40 Q100 10 200 34 T400 26 L400 120 L0 120 Z" fill={s.ground} />
        <path d="M0 70 Q120 50 230 70 T400 64 L400 120 L0 120 Z" fill={s.groundDark} opacity="0.6" />
      </svg>

      {/* 先生 */}
      <button
        type="button"
        onClick={onTapSensei}
        aria-label="先生をタップ"
        className="tile absolute left-1/2 -translate-x-1/2"
        style={{ bottom: compact ? -4 : showTable ? 62 : 10, width: compact ? 146 : 236 }}
      >
        <div className="bob">
          <div key={motionKey} className={motion}>
            <Sensei hatId={look.hat} outfitId={look.outfit} itemId={look.item} face={face} season={season} className="block h-auto w-full drop-shadow-[0_4px_0_rgba(74,52,39,0.18)]" />
          </div>
        </div>
      </button>

      {/* ふきだし */}
      {bubble && (
        <div
          key={bubble + motionKey}
          className="pop-in crayon absolute left-1/2 top-2 z-10 w-max max-w-[78%] -translate-x-1/2 bg-white px-3 py-1.5 text-center font-bold leading-snug"
          style={{ fontSize: compact ? "0.92em" : "1.05em" }}
          role="status"
          aria-live="polite"
        >
          {bubble}
        </div>
      )}

      {/* きょうのテーブル */}
      {showTable && !compact && (
        <div className="absolute inset-x-3 bottom-2 z-10">
          <div className="crayon flex items-center justify-around bg-[#f6e2c4] px-2 py-1" style={{ borderRadius: 18 }}>
            {s.table.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => onTapFood?.(f.name)}
                className="tile flex min-h-[56px] min-w-[72px] flex-col items-center justify-center rounded-2xl active:bg-white/60"
                aria-label={`${f.name}をたべる`}
              >
                <span className="emoji text-4xl">{f.emoji}</span>
                <span className="text-[0.7em] font-bold text-[var(--ink-soft)]">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

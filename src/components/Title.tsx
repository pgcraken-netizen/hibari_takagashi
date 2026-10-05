/* eslint-disable @next/next/no-img-element */
"use client";

import Emo from "./Emo";

/*
 * タイトル画面：キービジュアルの絵そのものに、タップできる場所を重ねる。
 * 座標はキービジュアル（941×1672）の座標。
 */
const IW = 941;
const IH = 1672;

export type TitleAction = "room" | "kisekae" | "cards" | "about" | "kisetsu" | "gohan" | "omakase" | "settings";

const RECTS: { id: TitleAction; label: string; x: number; y: number; w: number; h: number; round?: boolean }[] = [
  { id: "room", label: "先生のへやへ", x: 300, y: 400, w: 360, h: 610 },
  { id: "kisekae", label: "今日はなにをかぶる？", x: 720, y: 300, w: 200, h: 180, round: true },
  { id: "kisekae", label: "着せ替える", x: 245, y: 1045, w: 452, h: 126 },
  { id: "cards", label: "カードコレクション", x: 255, y: 1190, w: 437, h: 92 },
  { id: "about", label: "先生のことを知る", x: 255, y: 1294, w: 437, h: 94 },
  { id: "kisetsu", label: "季節のへや", x: 128, y: 1406, w: 146, h: 146, round: true },
  { id: "gohan", label: "ごはんタイム", x: 306, y: 1406, w: 146, h: 146, round: true },
  { id: "omakase", label: "おまかせ！", x: 484, y: 1406, w: 146, h: 146, round: true },
  { id: "settings", label: "設定", x: 676, y: 1406, w: 146, h: 146, round: true },
];

export default function Title({ onAction, found, total }: { onAction: (a: TitleAction) => void; found: number; total: number }) {
  return (
    <div className="mx-auto w-full max-w-[520px]">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${IW} / ${IH}` }}>
        <img src="/art/title.webp" alt="高橋先生とあそぼう！ うりずんの世界をめぐる着せ替えコレクションゲーム" className="absolute inset-0 h-full w-full" draggable={false} />
        {RECTS.map((r, i) => (
          <button
            key={i}
            type="button"
            aria-label={r.label}
            onClick={() => onAction(r.id)}
            className={`hotspot absolute ${r.round ? "rounded-full" : "rounded-[40px]"} ${r.id === "room" ? "hotspot-sensei" : ""}`}
            style={{ left: `${(r.x / IW) * 100}%`, top: `${(r.y / IH) * 100}%`, width: `${(r.w / IW) * 100}%`, height: `${(r.h / IH) * 100}%` }}
          />
        ))}
        <div className="tap-hint pointer-events-none absolute" style={{ left: "46%", top: "52%" }}>
          <Emo e="👆" size="2.4em" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 px-4 pb-8 pt-3">
        <button type="button" onClick={() => onAction("room")} className="btn pill pill-yellow w-full max-w-[420px] text-[1.4em]">
          <Emo e="🏡" size="1.5em" />
          先生のへやへ
        </button>
        <p className="font-hand text-[0.95em] text-[var(--ink-soft)]">
          <Emo e="👒" /> あつめた ぼうし {found} / {total}
        </p>
      </div>
    </div>
  );
}

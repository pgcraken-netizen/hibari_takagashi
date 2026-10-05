/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import Scene, { FULL_VIEW, HatFace, at } from "./Scene";
import { box, px } from "./Chrome";
import Emo from "../Emo";
import { HAT_BY_ID } from "@/data/hats";
import type { Face } from "@/data/content";
import { SEASONS, type Season } from "@/data/seasons";
import type { Food } from "@/lib/art";
import type { Look } from "@/lib/game";

export type HomeAction = "kisekae" | "cards" | "about" | "place" | "kisetsu";

const SEASON_KANJI: Record<Season, string> = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" };
const SEASON_SUN: Record<Season, string> = { spring: "🌸", summer: "🌻", autumn: "🍁", winter: "⛄" };

type Props = {
  look: Look;
  season: Season;
  face: Face;
  bubble: string | null;
  motion: string;
  motionKey: number;
  foods: Food[];
  eating: { slot: number; key: number } | null;
  voiceOn: boolean;
  bubbleOn: boolean;
  hatList: string[];
  lockedList: string[];
  onLocked: () => void;
  giftReady: boolean;
  omakaseDone: boolean;
  onTapSensei: () => void;
  onTapFood: (slot: number) => void;
  onToggleVoice: () => void;
  onToggleBubble: () => void;
  onHitokoto: () => void;
  onPhoto: () => void;
  onAction: (a: HomeAction) => void;
  onWearHat: (id: string) => void;
  onGift: () => void;
  onOmakase: () => void;
};

const BTNS: { id: HomeAction; label: string; x: number; w: number }[] = [
  { id: "kisekae", label: "着せ替え", x: 30, w: 192 },
  { id: "cards", label: "カード図鑑", x: 226, w: 167 },
  { id: "about", label: "先生のこと", x: 398, w: 168 },
  { id: "place", label: "うりずんの場所", x: 571, w: 169 },
  { id: "kisetsu", label: "季節のへや", x: 745, w: 173 },
];

export default function HomeScreen(p: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const today = new Date();
  const V = FULL_VIEW;
  const scroll = (d: number) => scroller.current?.scrollBy({ left: d * scroller.current.clientWidth * 0.7, behavior: "smooth" });
  // たての長い画面では、帽子を何段にもならべる
  const [multi, setMulti] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const card = (el.clientWidth / 800) * 168;
      setMulti(el.clientHeight > card * 1.9);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="cq relative flex w-full flex-1 flex-col">
      {/* ---------- へや ---------- */}
      <Scene look={p.look} season={p.season} face={p.face} motion={p.motion} motionKey={p.motionKey} foods={p.foods} eating={p.eating} onTapSensei={p.onTapSensei} onTapFood={p.onTapFood}>
        {/* きせつの看板 */}
        <div className="pointer-events-none flex flex-col items-center justify-center text-[#5a3a22]" style={at(V, 52, 168, 146, 86)}>
          <div className="flex items-center gap-[0.3em] font-black leading-none" style={{ fontSize: px(40) }}>
            <Emo e={SEASON_SUN[p.season]} size="1em" />
            <span style={{ color: "#e2546a" }}>{SEASON_KANJI[p.season]}</span>
          </div>
          <div className="mt-[0.2em] font-black leading-none" style={{ fontSize: px(30) }}>
            {today.getMonth() + 1}月{today.getDate()}日
          </div>
        </div>
        {/* カレンダー */}
        <div className="pointer-events-none flex items-center justify-center font-black text-[#6a4a32]" style={{ ...at(V, 800, 582, 60, 60), fontSize: px(40) }}>
          {today.getMonth() + 1}
        </div>

        {/* ふきだし */}
        {p.bubbleOn && p.bubble && (
          <div key={p.bubble + p.motionKey} className="cloud pop-in" style={{ ...at(V, 600, 290, 330), fontSize: px(p.bubble.length > 24 ? 26 : 29) }} role="status" aria-live="polite">
            <span>
              {p.bubble.split(" ").map((w, i) => (
                <span key={i} className="inline-block">
                  {w}
                  {"\u00a0"}
                </span>
              ))}
            </span>
          </div>
        )}

        {/* 左の丸ボタン */}
        <button type="button" onClick={p.onToggleVoice} className={`roundchip ${p.voiceOn ? "" : "off"}`} style={at(V, 16, 646, 108, 108)} aria-pressed={p.voiceOn}>
          <Emo e={p.voiceOn ? "🔊" : "🔇"} size={px(44)} />
          <span style={{ fontSize: px(20) }}>音声{p.voiceOn ? "ON" : "OFF"}</span>
        </button>
        <button type="button" onClick={p.onToggleBubble} className={`roundchip ${p.bubbleOn ? "" : "off"}`} style={at(V, 16, 770, 108, 108)} aria-pressed={p.bubbleOn}>
          <Emo e="💬" size={px(44)} />
          <span style={{ fontSize: px(18) }}>ふきだし{p.bubbleOn ? "ON" : "OFF"}</span>
        </button>
        <button type="button" onClick={p.onPhoto} className="roundchip" style={at(V, 16, 894, 108, 108)}>
          <Emo e="📸" size={px(44)} />
          <span style={{ fontSize: px(20) }}>しゃしん</span>
        </button>
        <button type="button" onClick={p.onHitokoto} className="roundchip" style={at(V, 800, 975, 112, 104)}>
          <Emo e="🖼️" size={px(42)} />
          <span style={{ fontSize: px(15) }}>今日の<br />ひとこと</span>
        </button>
      </Scene>

      {/* ---------- 大きいボタン ---------- */}
      <div className="relative w-full" style={{ aspectRatio: "941 / 190" }}>
        <img src="/art/home/btnrow.webp" alt="" className="absolute inset-0 h-full w-full" draggable={false} />
        {BTNS.map((b) => (
          <button key={b.id} type="button" onClick={() => p.onAction(b.id)} aria-label={b.label} className="hot bigbtn" style={box(b.x, 13, b.w, 159, 190)} />
        ))}
      </div>

      {/* ---------- 帽子をえらぶ（たての長い画面では下にのびる） ---------- */}
      <div className="hatpanel relative w-full flex-1">
        <div className="hatpanel-bg absolute inset-0" />
        <button type="button" onClick={p.onOmakase} className="omakase-pill" style={{ right: px(52), top: px(10), height: px(46), width: px(250), fontSize: px(26) }}>
          <Emo e={p.omakaseDone ? "🔁" : "⭐"} size="1.2em" />
          {p.omakaseDone ? "もう一回！" : "おまかせ！"}
        </button>
        {!multi && (
          <>
            <button type="button" aria-label="まえへ" onClick={() => scroll(-1)} className="arrowbtn" style={{ left: px(20) }}>
              ‹
            </button>
            <button type="button" aria-label="つぎへ" onClick={() => scroll(1)} className="arrowbtn" style={{ right: px(20) }}>
              ›
            </button>
          </>
        )}
        <div ref={scroller} className={`hatgrid scrollbar-none absolute ${multi ? "multi" : ""}`} style={{ left: px(multi ? 36 : 70), right: px(multi ? 36 : 70), top: px(58), bottom: px(16) }}>
          {p.giftReady && (
            <button type="button" onClick={p.onGift} className="hatcard gift">
              <span className="thumb flex items-center justify-center">
                <Emo e="🎁" size="70%" className="gift-bounce" />
              </span>
              <span className="lbl" style={{ fontSize: px(19) }}>ぼうしばこ</span>
            </button>
          )}
          {p.hatList.map((id) => (
            <button key={id} type="button" onClick={() => p.onWearHat(id)} className={`hatcard ${p.look.hat === id ? "sel" : ""}`} aria-pressed={p.look.hat === id}>
              <span className="thumb">
                <HatFace hat={id} className="h-full w-full" />
              </span>
              <span className="lbl" style={{ fontSize: px(HAT_BY_ID[id].name.length > 6 ? 15 : 19) }}>
                {HAT_BY_ID[id].name}
              </span>
              {p.look.hat === id && <span className="check">✓</span>}
            </button>
          ))}
          {p.lockedList.map((id) => (
            <button key={id} type="button" onClick={p.onLocked} className="hatcard locked" aria-label="まだ みつけていない ぼうし">
              <span className="thumb flex items-center justify-center">
                <img src={`/art/hat3d/${id}.webp`} alt="" className="silhouette w-[90%]" loading="lazy" draggable={false} />
              </span>
              <span className="lbl" style={{ fontSize: px(19) }}>？？？</span>
            </button>
          ))}
        </div>
      </div>
      <span className="sr-only">{SEASONS[p.season].label}</span>
    </div>
  );
}

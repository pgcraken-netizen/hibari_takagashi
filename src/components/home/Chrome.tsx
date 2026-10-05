/* eslint-disable @next/next/no-img-element */
"use client";

/*
 * ヘッダーとナビ（参考画像のパーツをそのまま使う）
 * 位置は参考画像の座標（幅 941）。文字サイズは cqw で、画面の幅に合わせて伸び縮みする。
 */

export const px = (v: number) => `${(v * 100) / 941}cqw`;

export function box(x: number, y: number, w: number, h: number, H: number): React.CSSProperties {
  return { position: "absolute", left: `${(x / 941) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / 941) * 100}%`, height: `${(h / H) * 100}%` };
}

export type NavId = "home" | "collection" | "album" | "profile" | "more";

const NAV: { id: NavId; label: string; cx: number }[] = [
  { id: "home", label: "ホーム", cx: 85 },
  { id: "collection", label: "コレクション", cx: 250 },
  { id: "album", label: "アルバム", cx: 402 },
  { id: "profile", label: "プロフィール", cx: 556 },
  { id: "more", label: "もっと知る", cx: 707 },
];

const NAV_ICON: Record<NavId, [number, number, number, number]> = {
  home: [50, 18, 70, 80],
  collection: [215, 45, 70, 55],
  album: [362, 40, 80, 64],
  profile: [522, 40, 68, 60],
  more: [680, 48, 55, 48],
};

export function Header({ cards, cardsTotal, hats, hatsTotal, onLogo, onCards, onHats, onSettings }: { cards: number; cardsTotal: number; hats: number; hatsTotal: number; onLogo: () => void; onCards: () => void; onHats: () => void; onSettings: () => void }) {
  const H = 112;
  return (
    <div className="cq relative w-full select-none" style={{ aspectRatio: `941 / ${H}` }}>
      <img src="/art/home/header.webp" alt="" className="absolute inset-0 h-full w-full" draggable={false} />
      <button type="button" aria-label="タイトルへ" onClick={onLogo} className="hot" style={box(8, 6, 250, 102, H)} />
      <button type="button" aria-label={`カード ${cards}/${cardsTotal}`} onClick={onCards} className="hot rounded-[14%]" style={box(512, 16, 136, 82, H)} />
      <button type="button" aria-label={`帽子 ${hats}/${hatsTotal}`} onClick={onHats} className="hot rounded-[14%]" style={box(656, 16, 168, 82, H)} />
      <button type="button" aria-label="設定" onClick={onSettings} className="hot rounded-full" style={box(845, 10, 84, 96, H)} />
      <span className="count pointer-events-none" style={{ ...box(570, 54, 80, 32, H), fontSize: px(25) }}>
        {cards}/{cardsTotal}
      </span>
      <span className="count pointer-events-none" style={{ ...box(728, 52, 96, 34, H), fontSize: px(28) }}>
        {hats}/{hatsTotal}
      </span>
    </div>
  );
}

export function Nav({ active, onGo, badge }: { active: NavId | null; onGo: (id: NavId) => void; badge?: NavId | null }) {
  const H = 172;
  return (
    <nav className="cq relative w-full select-none" style={{ aspectRatio: `941 / ${H}` }} aria-label="メニュー">
      <img src="/art/home/nav.webp" alt="" className="absolute inset-0 h-full w-full" draggable={false} />
      {NAV.map((n) => {
        const [ix, iy, iw, ih] = NAV_ICON[n.id];
        const on = active === n.id;
        return (
          <button key={n.id} type="button" onClick={() => onGo(n.id)} aria-current={on ? "page" : undefined} className={`navbtn ${on ? "on" : ""}`} style={box(n.cx - 78, 14, 156, 150, H)}>
            <img src={`/art/home/nav-${n.id}.webp`} alt="" draggable={false} className="absolute" style={{ left: `${((ix - (n.cx - 78)) / 156) * 100}%`, top: `${((iy - 14) / 150) * 100}%`, width: `${(iw / 156) * 100}%`, height: `${(ih / 150) * 100}%` }} />
            <span className="navlabel" style={{ fontSize: px(n.label.length > 5 ? 23 : 25) }}>
              {n.label}
            </span>
            {on && <span className="navline" />}
            {badge === n.id && <span className="badge-new2" style={{ fontSize: px(16) }}>NEW</span>}
          </button>
        );
      })}
    </nav>
  );
}

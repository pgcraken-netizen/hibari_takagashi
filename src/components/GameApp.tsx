"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Stage from "./Stage";
import Sensei, { splitEmoji } from "./Sensei";
import { HATS, HAT_BY_ID, HAT_CATEGORIES, RARITY_LABEL, type HatCategory } from "@/data/hats";
import { OUTFITS } from "@/data/outfits";
import { CARDS, ITEMS, OFFICIAL_LINKS, REACTIONS, TAP_SENSEI, greetingByHour, type Face } from "@/data/content";
import { SEASONS, SEASON_ORDER, seasonOf, type Season } from "@/data/seasons";
import {
  dailyMessage,
  hashString,
  loadSave,
  omakaseHat,
  pick,
  pickNewHat,
  randomLookParts,
  seededRandom,
  todayKey,
  writeSave,
  type Look,
  type SaveData,
  type Settings,
} from "@/lib/game";
import { playSfx, speak, startBgm, stopBgm, vibrate, type Sfx } from "@/lib/audio";

type Screen = "home" | "kisekae" | "zukan" | "cards" | "kisetsu" | "about" | "settings";

type Popup = { kind: "hat"; id: string; reason: string } | { kind: "card"; id: string } | { kind: "hatInfo"; id: string } | { kind: "cardInfo"; id: string };

const NAV: { id: Screen; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "ホーム" },
  { id: "kisekae", icon: "🎩", label: "きせかえ" },
  { id: "zukan", icon: "📖", label: "ずかん" },
  { id: "cards", icon: "🃏", label: "カード" },
  { id: "kisetsu", icon: "🌸", label: "きせつ" },
  { id: "about", icon: "👨‍⚕️", label: "先生" },
];

const TOTAL = HATS.length;

export default function GameApp() {
  const [save, setSave] = useState<SaveData | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [face, setFace] = useState<Face>("smile");
  const [bubble, setBubble] = useState<string | null>(null);
  const [motion, setMotion] = useState("hop");
  const [motionKey, setMotionKey] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [viewSeason, setViewSeason] = useState<Season>("spring");
  const [omakaseDone, setOmakaseDone] = useState(false);
  const realSeason = useMemo(() => seasonOf(new Date()), []);
  const timers = useRef<number[]>([]);
  const saveRef = useRef<SaveData | null>(null);
  saveRef.current = save;
  const update = (fn: (s: SaveData) => SaveData) => {
    const s = saveRef.current;
    if (!s) return;
    const n = fn(s);
    saveRef.current = n;
    setSave(n);
  };

  /* ---------- 読み込み & きょうの先生 ---------- */
  useEffect(() => {
    const s = loadSave();
    const today = todayKey();
    const season = seasonOf(new Date());
    setViewSeason(season);
    const queue: Popup[] = [];
    if (s.lastDay !== today) {
      const rnd = seededRandom(hashString(today));
      const found = new Set(s.found);
      const newHat = pickNewHat(found, season, rnd) ?? pick(HATS, rnd).id;
      const look: Look = { hat: newHat, outfit: pick(OUTFITS, rnd).id, item: pick(ITEMS.slice(1), rnd).id };
      s.todayLook = look;
      s.look = look;
      s.lastDay = today;
      if (!found.has(newHat)) {
        const before = s.found.length;
        s.found = [...s.found, newHat];
        queue.push({ kind: "hat", id: newHat, reason: "きょうの ぼうし！" });
        CARDS.forEach((c) => {
          const at = Math.min(c.unlockAt, TOTAL);
          if (before < at && s.found.length >= at) queue.push({ kind: "card", id: c.id });
        });
      }
    }
    setSave(s);
    setPopups(queue);
    setBubble(`${greetingByHour(new Date().getHours())} ${dailyMessage(today)}`);
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    if (save) writeSave(save);
  }, [save]);

  /* PWA（本番のみ） */
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  /* BGM */
  useEffect(() => {
    if (!save) return;
    if (save.settings.bgm) startBgm();
    else stopBgm();
    return () => stopBgm();
  }, [save?.settings.bgm]); // eslint-disable-line react-hooks/exhaustive-deps

  const settings = save?.settings;

  /* ---------- 共通の「受け止める」反応 ---------- */
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const react = useCallback(
    (text: string, f: Face = "smile", m: string = "hop", sfx: Sfx | null = "pop", say = true) => {
      setBubble(text);
      setFace(f);
      setMotion(m);
      setMotionKey((k) => k + 1);
      if (!settings) return;
      if (sfx && settings.sfx) playSfx(sfx);
      vibrate(settings.vibration);
      if (say && settings.voice) speak(text);
    },
    [settings],
  );

  const updateSettings = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  /** 帽子を見つける（＋カード解放チェック） */
  const discover = useCallback((s: SaveData, hatId: string, reason: string): SaveData => {
    if (s.found.includes(hatId)) return s;
    const before = s.found.length;
    const found = [...s.found, hatId];
    const add: Popup[] = [{ kind: "hat", id: hatId, reason }];
    CARDS.forEach((c) => {
      const at = Math.min(c.unlockAt, TOTAL);
      if (before < at && found.length >= at) add.push({ kind: "card", id: c.id });
    });
    setPopups((p) => [...p, ...add]);
    return { ...s, found, sinceNew: 0 };
  }, []);

  /* ---------- 操作 ---------- */

  const tapSensei = () => {
    const r = pick(TAP_SENSEI);
    react(r.text, r.face, "wiggle");
  };

  const tapFood = (name: string) => {
    if (!save) return;
    react("いただきます！", "yummy", "chew", "eat");
    later(() => react(`${name}、おいしい！`, "happy", "hop", null), 1300);
    update((s) => {
      const taps = s.foodTaps + 1;
      if (taps % 4 === 0) {
        const n = pickNewHat(new Set(s.found), viewSeason);
        if (n) later(() => update((x) => discover(x, n, "ごちそうさまの おれい！")), 2200);
      }
      return { ...s, foodTaps: taps };
    });
  };

  const omakase = () => {
    if (!save) return;
    const { outfit, item } = randomLookParts();
    const r = omakaseHat(new Set(save.found), save.sinceNew, viewSeason);
    const bg = pick(SEASON_ORDER);
    setViewSeason(bg);
    react("せーの…", "surprise", "shuffle", "omakase", false);
    later(() => {
      update((s) => {
        const next: SaveData = { ...s, look: { hat: r.hat, outfit, item }, omakaseCount: s.omakaseCount + 1, sinceNew: s.sinceNew + 1 };
        return r.isNew ? discover(next, r.hat, "おまかせで みつけた！") : next;
      });
      const hat = HAT_BY_ID[r.hat];
      const lines = ["今日の先生はこちら！", "今日の先生、なんかすごい！", `${hat.name}のぼうし！`];
      react(`${pick(lines)} ${hat.voice}`, pick<Face>(["happy", "proud", "smile"]), "hop", "select");
      setOmakaseDone(true);
    }, 650);
  };

  const wear = (patch: Partial<Look>, line: string) => {
    update((s) => ({ ...s, look: { ...s.look, ...patch } }));
    react(line, pick<Face>(["smile", "happy", "proud"]), "hop", "select");
  };

  const goto = (sc: Screen) => {
    setScreen(sc);
    if (settings?.sfx) playSfx("pop");
    vibrate(!!settings?.vibration);
    window.scrollTo({ top: 0 });
    if (sc === "kisekae" && settings?.voiceMode) speak("ぼうしを えらんでね");
    if (sc === "home") setViewSeason((v) => v);
  };

  const closePopup = () => setPopups((p) => p.slice(1));

  /* popup を出したときに声と音 */
  const current = popups[0];
  useEffect(() => {
    if (!current || !settings) return;
    if (current.kind === "hat") {
      if (settings.sfx) playSfx("new");
      if (settings.voice) speak(`あたらしい ぼうし！ ${HAT_BY_ID[current.id].name}！`);
    } else if (current.kind === "card") {
      if (settings.sfx) playSfx("card");
      if (settings.voice) speak("あたらしい カードが ふえたよ！");
    }
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!save || !settings) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="title-font text-2xl">よみこみちゅう…</div>
      </div>
    );
  }

  const found = new Set(save.found);
  const unlockedCards = CARDS.filter((c) => save.found.length >= Math.min(c.unlockAt, TOTAL));
  const newCardCount = unlockedCards.filter((c) => !save.seenCards.includes(c.id)).length;

  return (
    <div className={`app ${settings.bigText ? "big-text" : ""} ${settings.animation ? "anim" : "no-anim"} mx-auto flex min-h-dvh max-w-[520px] flex-col`}>
      {/* ヘッダー */}
      <header className="flex items-center gap-2 px-3 pt-3">
        <button type="button" onClick={() => goto("home")} className="flex-1 text-left" aria-label="ホームへ">
          <div className="title-font whitespace-nowrap text-[1.2em] leading-tight">
            <span>高橋先生と</span>
            <span className="text-[#e8743b]">あ</span>
            <span className="text-[#e9a92a]">そ</span>
            <span className="text-[#4fa35a]">ぼ</span>
            <span className="text-[#3f8fd0]">う</span>
            <span className="text-[#d9707f]">！</span>
          </div>
          <div className="text-[0.72em] text-[var(--ink-soft)]">今日は、先生なに着てる？</div>
        </button>
        <div className="crayon bg-white px-3 py-1 text-center text-[0.8em] font-bold" aria-label={`ぼうし ${save.found.length}こ`}>
          <span className="emoji">🎩</span> {save.found.length}/{TOTAL}
        </div>
        <button type="button" onClick={() => goto("settings")} className="btn crayon flex h-[56px] w-[56px] min-h-0 items-center justify-center bg-[var(--blue)]" aria-label="せってい">
          <span className="emoji text-2xl">⚙️</span>
        </button>
      </header>

      <main className="flex-1 px-3 pb-28 pt-3">
        {screen === "home" && (
          <Home
            save={save}
            face={face}
            bubble={bubble}
            motion={motion}
            motionKey={motionKey}
            season={viewSeason}
            realSeason={realSeason}
            omakaseDone={omakaseDone}
            onTapSensei={tapSensei}
            onTapFood={tapFood}
            onOmakase={omakase}
            onGo={goto}
            onBackSeason={() => {
              setViewSeason(realSeason);
              react(SEASONS[realSeason].greeting, "smile", "hop");
            }}
            newCardCount={newCardCount}
          />
        )}
        {screen === "kisekae" && (
          <Kisekae
            save={save}
            found={found}
            face={face}
            bubble={bubble}
            motion={motion}
            motionKey={motionKey}
            season={viewSeason}
            voiceMode={settings.voiceMode}
            onTapSensei={tapSensei}
            onWear={wear}
            onDiscover={(id) => update((s) => discover({ ...s, look: { ...s.look, hat: id } }, id, "ぼうしばこから でてきた！"))}
            onLocked={() => react("まだ みつけてないよ。どこにあるかな？", "surprise", "wiggle")}
            onOmakase={omakase}
          />
        )}
        {screen === "zukan" && <Zukan found={found} favorites={save.favorites} onOpen={(id) => setPopups((p) => [{ kind: "hatInfo", id }, ...p])} onLocked={() => react("まだ ひみつ！", "proud", "wiggle")} />}
        {screen === "cards" && (
          <Cards
            count={save.found.length}
            seen={save.seenCards}
            onOpen={(id) => {
              setPopups((p) => [{ kind: "cardInfo", id }, ...p]);
              update((s) => (s.seenCards.includes(id) ? s : { ...s, seenCards: [...s.seenCards, id] }));
              if (settings.voice) speak(CARDS.find((c) => c.id === id)!.title);
              if (settings.sfx) playSfx("card");
            }}
          />
        )}
        {screen === "kisetsu" && (
          <Kisetsu
            realSeason={realSeason}
            found={found}
            onSay={(t) => {
              if (settings.voice) speak(t);
              if (settings.sfx) playSfx("pop");
              vibrate(settings.vibration);
            }}
            onUse={(s) => {
              setViewSeason(s);
              goto("home");
              later(() => react(SEASONS[s].greeting, "smile", "hop"), 50);
            }}
          />
        )}
        {screen === "about" && <About onSay={(t) => settings.voice && speak(t)} />}
        {screen === "settings" && <SettingsScreen settings={settings} onChange={updateSettings} onReset={() => {
          if (window.confirm("あそんだ きろくを ぜんぶ けしますか？（もとに もどせません）")) {
            localStorage.clear();
            location.reload();
          }
        }} />}
      </main>

      {/* ナビゲーション */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-[var(--ink)] bg-[var(--paper)]" aria-label="メニュー">
        <ul className="mx-auto grid max-w-[520px] grid-cols-6">
          {NAV.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => goto(n.id)}
                aria-current={screen === n.id ? "page" : undefined}
                className={`tile relative flex min-h-[66px] w-full flex-col items-center justify-center gap-0.5 ${screen === n.id ? "bg-[var(--yellow)]" : ""}`}
              >
                <span className="emoji text-[1.7em]">{n.icon}</span>
                <span className="text-[0.66em] font-bold">{n.label}</span>
                {n.id === "cards" && newCardCount > 0 && (
                  <span className="absolute right-2 top-1 rounded-full bg-[var(--pink-d)] px-1.5 text-[0.6em] font-bold text-white">NEW</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {current && (
        <PopupView
          popup={current}
          look={save.look}
          season={viewSeason}
          isFav={current.kind === "hatInfo" && save.favorites.includes(current.id)}
          onClose={closePopup}
          onSay={(t) => settings.voice && speak(t)}
          onWear={(id) => {
            closePopup();
            setScreen("home");
            wear({ hat: id }, `${HAT_BY_ID[id].name}の ぼうし！ ${HAT_BY_ID[id].voice}`);
          }}
          onFav={(id) => update((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] }))}
          onOpenCards={() => {
            closePopup();
            goto("cards");
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
 * ホーム
 * ========================================================= */

function Home(props: {
  save: SaveData;
  face: Face;
  bubble: string | null;
  motion: string;
  motionKey: number;
  season: Season;
  realSeason: Season;
  omakaseDone: boolean;
  newCardCount: number;
  onTapSensei: () => void;
  onTapFood: (n: string) => void;
  onOmakase: () => void;
  onGo: (s: Screen) => void;
  onBackSeason: () => void;
}) {
  const { save, season, realSeason } = props;
  return (
    <div className="flex flex-col gap-3">
      <Stage
        look={save.look}
        face={props.face}
        season={season}
        bubble={props.bubble}
        motion={props.motion}
        motionKey={props.motionKey}
        onTapSensei={props.onTapSensei}
        onTapFood={props.onTapFood}
      />
      {season !== realSeason && (
        <button type="button" onClick={props.onBackSeason} className="btn crayon flex items-center justify-center gap-2 bg-white text-[0.95em] font-bold" style={{ minHeight: 48 }}>
          <span className="emoji">{SEASONS[season].icon}</span>いまは「{SEASONS[season].label}」のけしき → いまのきせつにもどる
        </button>
      )}

      <button type="button" onClick={props.onOmakase} className="btn crayon flex items-center justify-center gap-3 bg-[var(--yellow)] text-[1.5em] font-black">
        <span className="emoji text-[1.3em]">{props.omakaseDone ? "🔁" : "⭐"}</span>
        {props.omakaseDone ? "もう一回！" : "先生をおまかせ！"}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <BigButton color="pink" icon="🎩" label="きせかえる" onClick={() => props.onGo("kisekae")} />
        <BigButton color="green" icon="📖" label="ずかん" onClick={() => props.onGo("zukan")} />
        <BigButton color="orange" icon="🃏" label="カード" badge={props.newCardCount > 0} onClick={() => props.onGo("cards")} />
        <BigButton color="blue" icon="👨‍⚕️" label="先生のこと" onClick={() => props.onGo("about")} />
      </div>

      <p className="text-center text-[0.8em] text-[var(--ink-soft)]">
        <span className="emoji">👆</span> 先生や テーブルの たべものを タップしてみてね
      </p>
    </div>
  );
}

function BigButton({ color, icon, label, onClick, badge }: { color: "pink" | "green" | "blue" | "orange" | "yellow"; icon: string; label: string; onClick: () => void; badge?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="btn crayon relative flex items-center justify-center gap-2 whitespace-nowrap px-2 text-[1.1em] font-bold" style={{ background: `var(--${color})` }}>
      {badge && <span className="absolute right-2 top-1 rounded-full bg-[var(--pink-d)] px-2 text-[0.6em] font-bold text-white">NEW</span>}
      <span className="emoji text-[1.4em]">{icon}</span>
      {label}
    </button>
  );
}

/* =========================================================
 * きせかえ
 * ========================================================= */

function Kisekae(props: {
  save: SaveData;
  found: Set<string>;
  face: Face;
  bubble: string | null;
  motion: string;
  motionKey: number;
  season: Season;
  voiceMode: boolean;
  onTapSensei: () => void;
  onWear: (p: Partial<Look>, line: string) => void;
  onDiscover: (id: string) => void;
  onLocked: () => void;
  onOmakase: () => void;
}) {
  const { save, found } = props;
  const [tab, setTab] = useState<"hat" | "outfit" | "item">("hat");
  const [cat, setCat] = useState<HatCategory | "fav">(HAT_BY_ID[save.look.hat]?.category ?? "food");

  // おすすめ3つ：見つけた帽子から2つ＋「ぼうしばこ（まだ見ぬ帽子）」1つ
  const recs = useMemo(() => {
    const day = todayKey();
    const rnd = seededRandom(hashString("rec" + day + save.found.length));
    const own = save.found.filter((h) => h !== save.look.hat);
    const a = own.length ? pick(own, rnd) : null;
    const rest = own.filter((x) => x !== a);
    const b = rest.length ? pick(rest, rnd) : null;
    const box = pickNewHat(found, props.season, rnd);
    return { own: [a, b].filter(Boolean) as string[], box };
  }, [save.found, save.look.hat, found, props.season]);

  const list = cat === "fav" ? HATS.filter((h) => save.favorites.includes(h.id)) : HATS.filter((h) => h.category === cat);
  const voiceLine = (name: string, v: string) => (props.voiceMode ? `これは ${name} だよ！ これにする？` : `${pick(REACTIONS)} ${v}`);

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-20 -mx-3 bg-[var(--cream)] px-3 pb-2 pt-1">
        <Stage
          compact
          look={save.look}
          face={props.face}
          season={props.season}
          bubble={props.bubble}
          motion={props.motion}
          motionKey={props.motionKey}
          onTapSensei={props.onTapSensei}
          showTable={false}
        />
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(
            [
              ["hat", "🎩", "ぼうし"],
              ["outfit", "👔", "ふく"],
              ["item", "🎈", "こもの"],
            ] as const
          ).map(([id, icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`btn crayon flex flex-col items-center justify-center text-[0.9em] font-bold ${tab === id ? "bg-[var(--yellow)]" : "bg-white"}`}
            >
              <span className="emoji text-2xl">{icon}</span>
              {label}
            </button>
          ))}
          <button type="button" onClick={props.onOmakase} className="btn crayon flex flex-col items-center justify-center bg-[var(--pink)] text-[0.9em] font-bold">
            <span className="emoji text-2xl">⭐</span>
            おまかせ
          </button>
        </div>
      </div>

      {tab === "hat" && (
        <>
          <section>
            <h2 className="mb-1 font-bold">
              <span className="emoji">✨</span> おすすめ 3つ
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {recs.own.map((id) => (
                <HatTile key={id} id={id} selected={save.look.hat === id} onClick={() => props.onWear({ hat: id }, voiceLine(HAT_BY_ID[id].name, HAT_BY_ID[id].voice))} />
              ))}
              {recs.box ? (
                <button type="button" onClick={() => props.onDiscover(recs.box!)} className="btn tile crayon flex aspect-square flex-col items-center justify-center bg-[var(--orange)] font-bold" aria-label="ぼうしばこを あける">
                  <span className="emoji text-[2.6em]">🎁</span>
                  <span className="text-[0.75em]">ぼうしばこ</span>
                </button>
              ) : null}
              {Array.from({ length: Math.max(0, 3 - recs.own.length - (recs.box ? 1 : 0)) }).map((_, i) => (
                <div key={i} className="crayon flex aspect-square items-center justify-center bg-white/60 text-[0.75em] text-[var(--ink-soft)]">
                  あつめよう
                </div>
              ))}
            </div>
          </section>

          <div className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 py-1">
            {[...HAT_CATEGORIES, { id: "fav" as const, label: "おきにいり", icon: "💛" }].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={`tile crayon flex min-h-[52px] shrink-0 items-center gap-1 px-3 text-[0.9em] font-bold ${cat === c.id ? "bg-[var(--green)]" : "bg-white"}`}
              >
                <span className="emoji text-xl">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {list.map((h) =>
              found.has(h.id) ? (
                <HatTile key={h.id} id={h.id} selected={save.look.hat === h.id} onClick={() => props.onWear({ hat: h.id }, voiceLine(h.name, h.voice))} showName />
              ) : (
                <button key={h.id} type="button" onClick={props.onLocked} className="tile crayon flex aspect-square flex-col items-center justify-center bg-white/70" aria-label="まだ みつけていない ぼうし">
                  <span className="emoji silhouette text-[2.4em]">{splitEmoji(h.emoji)[0]}</span>
                  <span className="text-[0.7em] text-[var(--ink-soft)]">？？？</span>
                </button>
              ),
            )}
            {list.length === 0 && <p className="col-span-3 py-6 text-center text-[var(--ink-soft)]">ずかんで 💛 をつけると、ここに ならぶよ</p>}
          </div>
        </>
      )}

      {tab === "outfit" && (
        <div className="grid grid-cols-2 gap-2">
          {OUTFITS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => props.onWear({ outfit: o.id }, props.voiceMode ? `これは ${o.name} だよ！` : pick(["にあってる？", "きまってる！", "いいね！", "これにしよう！"]))}
              aria-pressed={save.look.outfit === o.id}
              className={`tile crayon flex flex-col items-center p-1 ${save.look.outfit === o.id ? "bg-[var(--yellow)]" : "bg-white"}`}
            >
              <div className="h-[96px] w-[96px] overflow-hidden">
                <Sensei hatId="" outfitId={o.id} itemId="item_none" face="smile" season={props.season} className="mt-[-46px] h-auto w-full" />
              </div>
              <span className="pb-1 text-[0.8em] font-bold">{o.name}</span>
            </button>
          ))}
        </div>
      )}

      {tab === "item" && (
        <div className="grid grid-cols-3 gap-2">
          {ITEMS.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => props.onWear({ item: it.id }, props.voiceMode ? `これは ${it.name} だよ！` : it.voice)}
              aria-pressed={save.look.item === it.id}
              className={`tile crayon flex aspect-square flex-col items-center justify-center ${save.look.item === it.id ? "bg-[var(--yellow)]" : "bg-white"}`}
            >
              <span className="emoji text-[2.4em]">{it.emoji}</span>
              <span className="text-[0.75em] font-bold">{it.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HatTile({ id, selected, onClick, showName }: { id: string; selected?: boolean; onClick: () => void; showName?: boolean }) {
  const h = HAT_BY_ID[id];
  const parts = splitEmoji(h.emoji);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${h.name}のぼうし`}
      className={`tile crayon flex aspect-square flex-col items-center justify-center ${selected ? "bg-[var(--yellow)]" : "bg-white"}`}
    >
      <span className="emoji text-[2.4em]">{parts[0]}</span>
      {parts.length > 1 && <span className="emoji text-[0.9em]">{parts.slice(1).join("")}</span>}
      {showName && <span className="mt-0.5 px-1 text-center text-[0.68em] font-bold leading-tight">{h.name}</span>}
    </button>
  );
}

/* =========================================================
 * ずかん
 * ========================================================= */

function Zukan({ found, favorites, onOpen, onLocked }: { found: Set<string>; favorites: string[]; onOpen: (id: string) => void; onLocked: () => void }) {
  const n = found.size;
  return (
    <div className="flex flex-col gap-3">
      <div className="crayon bg-white p-3">
        <h1 className="title-font text-[1.4em]">
          <span className="emoji">📖</span> ぼうしずかん
        </h1>
        <div className="mt-1 flex items-end justify-between">
          <span className="text-[1.6em] font-black">
            {n} <span className="text-[0.6em]">/ {TOTAL}</span>
          </span>
          <span className="text-[0.85em] text-[var(--ink-soft)]">{n < TOTAL ? `あと ${TOTAL - n}こ。ゆっくり あつめよう` : "ぜんぶ みつけた！"}</span>
        </div>
        <div className="mt-2 h-4 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--cream)]">
          <div className="h-full bg-[var(--green)]" style={{ width: `${(n / TOTAL) * 100}%` }} />
        </div>
      </div>

      {HAT_CATEGORIES.map((c) => {
        const hats = HATS.filter((h) => h.category === c.id);
        const got = hats.filter((h) => found.has(h.id)).length;
        return (
          <section key={c.id}>
            <h2 className="mb-1 flex items-center justify-between font-bold">
              <span>
                <span className="emoji">{c.icon}</span> {c.label}
              </span>
              <span className="text-[0.85em] text-[var(--ink-soft)]">
                {got} / {hats.length}
              </span>
            </h2>
            <div className="grid grid-cols-5 gap-1.5">
              {hats.map((h) =>
                found.has(h.id) ? (
                  <button key={h.id} type="button" onClick={() => onOpen(h.id)} className="tile relative flex aspect-square items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-white" aria-label={h.name}>
                    <span className="emoji text-[1.8em]">{splitEmoji(h.emoji)[0]}</span>
                    {favorites.includes(h.id) && <span className="emoji absolute right-0.5 top-0.5 text-[0.7em]">💛</span>}
                  </button>
                ) : (
                  <button key={h.id} type="button" onClick={onLocked} className="tile flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-[var(--ink-soft)] bg-white/50" aria-label="まだ みつけていない">
                    <span className="emoji silhouette text-[1.6em]">{splitEmoji(h.emoji)[0]}</span>
                  </button>
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* =========================================================
 * カード
 * ========================================================= */

function Cards({ count, seen, onOpen }: { count: number; seen: string[]; onOpen: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="crayon bg-white p-3">
        <h1 className="title-font text-[1.4em]">
          <span className="emoji">🃏</span> 高橋先生カード
        </h1>
        <p className="text-[0.85em] text-[var(--ink-soft)]">ぼうしを みつけると、先生のことが すこしずつ わかるよ。</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((c) => {
          const at = Math.min(c.unlockAt, TOTAL);
          const open = count >= at;
          return open ? (
            <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="tile crayon relative flex flex-col items-center gap-1 p-3 text-center" style={{ background: c.color }}>
              {!seen.includes(c.id) && <span className="absolute right-2 top-2 rounded-full bg-[var(--pink-d)] px-2 text-[0.65em] font-bold text-white">NEW</span>}
              <span className="text-[0.7em] font-bold opacity-70">CARD {c.no}</span>
              <span className="emoji text-[2.6em]">{c.emoji}</span>
              <span className="font-bold leading-tight">{c.title}</span>
            </button>
          ) : (
            <div key={c.id} className="crayon flex flex-col items-center gap-1 bg-white/60 p-3 text-center">
              <span className="text-[0.7em] font-bold opacity-60">CARD {c.no}</span>
              <span className="emoji silhouette text-[2.6em]">{c.emoji}</span>
              <span className="text-[0.8em] text-[var(--ink-soft)]">
                あと <b>{at - count}</b>こ ぼうしを
                <br />
                みつけると…
              </span>
            </div>
          );
        })}
      </div>

      <section className="crayon mt-2 bg-white p-3">
        <h2 className="font-bold">
          <span className="emoji">📸</span> ほんものの先生カード
        </h2>
        <p className="mt-1 text-[0.85em] text-[var(--ink-soft)]">「この帽子、ほんとうに かぶったことが あるんだって！」 ほんものの写真は、じゅんびちゅう。</p>
      </section>
    </div>
  );
}

/* =========================================================
 * きせつ
 * ========================================================= */

function Kisetsu({ realSeason, found, onSay, onUse }: { realSeason: Season; found: Set<string>; onSay: (t: string) => void; onUse: (s: Season) => void }) {
  const [sel, setSel] = useState<Season>(realSeason);
  const s = SEASONS[sel];
  const hats = HATS.filter((h) => h.season?.includes(sel));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {SEASON_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSel(id);
              onSay(SEASONS[id].label);
            }}
            aria-pressed={sel === id}
            className={`btn crayon flex flex-col items-center justify-center font-bold ${sel === id ? "bg-[var(--yellow)]" : "bg-white"}`}
          >
            <span className="emoji text-2xl">{SEASONS[id].icon}</span>
            {SEASONS[id].label}
            {id === realSeason && <span className="text-[0.6em]">いま</span>}
          </button>
        ))}
      </div>

      <div className="crayon overflow-hidden p-3" style={{ background: `linear-gradient(180deg, ${s.skyTop}, ${s.skyBottom})` }}>
        <h1 className="title-font text-[1.4em]">
          <span className="emoji">{s.icon}</span> {s.label}のへや
        </h1>
        <p className="font-bold">{s.greeting}</p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {s.things.map((t, i) => (
            <button key={i} type="button" onClick={() => onSay(t.name)} className="tile flex flex-col items-center rounded-2xl bg-white/70 p-1">
              <span className="emoji text-[2em]">{t.emoji}</span>
              <span className="text-[0.62em] font-bold leading-tight">{t.name}</span>
            </button>
          ))}
        </div>
        <h2 className="mt-3 font-bold">
          <span className="emoji">🍽️</span> きょうのテーブル
        </h2>
        <div className="mt-1 flex justify-around rounded-2xl bg-[#f6e2c4] p-2">
          {s.table.map((t) => (
            <button key={t.name} type="button" onClick={() => onSay(t.name)} className="tile flex flex-col items-center">
              <span className="emoji text-[2.2em]">{t.emoji}</span>
              <span className="text-[0.7em] font-bold">{t.name}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onUse(sel)} className="btn crayon mt-3 w-full bg-[var(--green)] text-[1.1em] font-bold">
          <span className="emoji">🏠</span> {s.label}のけしきで あそぶ
        </button>
      </div>

      <section>
        <h2 className="mb-1 font-bold">
          <span className="emoji">🎩</span> {s.label}の ぼうし
        </h2>
        <div className="grid grid-cols-5 gap-1.5">
          {hats.map((h) => (
            <div key={h.id} className={`flex aspect-square items-center justify-center rounded-xl border-2 ${found.has(h.id) ? "border-[var(--ink)] bg-white" : "border-dashed border-[var(--ink-soft)] bg-white/50"}`}>
              <span className={`emoji text-[1.6em] ${found.has(h.id) ? "" : "silhouette"}`}>{splitEmoji(h.emoji)[0]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* =========================================================
 * 先生について
 * ========================================================= */

function About({ onSay }: { onSay: (t: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="crayon flex items-center gap-3 bg-white p-3">
        <div className="w-[110px] shrink-0">
          <Sensei hatId="hat_022" outfitId="outfit_002" itemId="item_none" face="smile" className="h-auto w-full" />
        </div>
        <div>
          <h1 className="title-font text-[1.3em] leading-tight">高橋先生って、どんなひと？</h1>
          <button type="button" onClick={() => onSay("たかはし せんせいは、こどもの おいしゃさん。うりずん という ばしょを つくったよ。")} className="btn crayon mt-2 flex min-h-[48px] items-center gap-1 bg-[var(--yellow)] px-3 text-[0.9em] font-bold">
            <span className="emoji">🔊</span> きいてみる
          </button>
        </div>
      </div>

      <section className="crayon bg-white p-3 leading-relaxed">
        <p>
          <b>子どもの おいしゃさん</b>。びょういんだけでなく、おうちにも みに いきます。
        </p>
        <p className="mt-2">
          おもい しょうがいの ある 子どもと かぞくが、たのしく あんしんして すごせる ばしょ <b>「うりずん」</b>を つくりました。
        </p>
        <p className="mt-2">イベントでは、てんとうむしや にこにこの ぼうしを かぶって とうじょう することも！</p>
      </section>

      <section className="crayon bg-[#eaf6ff] p-3">
        <h2 className="font-bold">
          <span className="emoji">👨‍👩‍👧</span> おとなの かたへ
        </h2>
        <p className="mt-1 text-[0.9em] leading-relaxed">
          宇都宮市で小児科・在宅医療に携わり、認定NPO法人うりずんの理事長を務める髙橋昭彦先生。うりずんでは、重い障がいのある子どもと家族のために、日中活動・児童発達支援・放課後等デイサービス・訪問支援・相談支援などを行っています。
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {OFFICIAL_LINKS.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn crayon flex items-center justify-between bg-white px-3 font-bold" style={{ minHeight: 52 }}>
                {l.label}
                <span className="text-[0.8em] text-[var(--ink-soft)]">公式サイト ↗</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[0.75em] text-[var(--ink-soft)]">※ 外部サイトがひらきます。おとなの人と いっしょに みてね。</p>
      </section>
    </div>
  );
}

/* =========================================================
 * せってい
 * ========================================================= */

function SettingsScreen({ settings, onChange, onReset }: { settings: Settings; onChange: (p: Partial<Settings>) => void; onReset: () => void }) {
  const rows: { key: keyof Settings; icon: string; label: string; note?: string }[] = [
    { key: "voice", icon: "🗣️", label: "先生の こえ" },
    { key: "voiceMode", icon: "👂", label: "おんせいで あそぶ", note: "なまえを こえで おしえてくれます" },
    { key: "sfx", icon: "🔔", label: "こうかおん" },
    { key: "bgm", icon: "🎵", label: "BGM（オルゴール）" },
    { key: "vibration", icon: "📳", label: "しんどう" },
    { key: "animation", icon: "🌀", label: "うごき（アニメーション）" },
    { key: "bigText", icon: "🔠", label: "もじを おおきく" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <h1 className="title-font text-[1.4em]">
        <span className="emoji">⚙️</span> せってい
      </h1>
      {rows.map((r) => {
        const on = settings[r.key];
        return (
          <button
            key={r.key}
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => onChange({ [r.key]: !on })}
            className={`btn crayon flex items-center gap-3 px-3 text-left ${on ? "bg-[var(--green)]" : "bg-white"}`}
          >
            <span className="emoji text-2xl">{r.icon}</span>
            <span className="flex-1">
              <span className="block font-bold">{r.label}</span>
              {r.note && <span className="block text-[0.75em] text-[var(--ink-soft)]">{r.note}</span>}
            </span>
            <span className={`flex h-9 w-[76px] items-center justify-center rounded-full border-[3px] border-[var(--ink)] font-black ${on ? "bg-white" : "bg-[#ddd]"}`}>{on ? "ON" : "OFF"}</span>
          </button>
        );
      })}
      <p className="text-[0.78em] leading-relaxed text-[var(--ink-soft)]">
        このゲームは とうろく いりません。あそんだ きろくは、この たんまつの なかだけに ほぞんされます。こうこく・かきん は ありません。
      </p>
      <button type="button" onClick={onReset} className="mt-4 self-center text-[0.8em] text-[var(--ink-soft)] underline">
        きろくを さいしょから にする
      </button>
    </div>
  );
}

/* =========================================================
 * ポップアップ
 * ========================================================= */

function PopupView(props: {
  popup: Popup;
  look: Look;
  season: Season;
  isFav: boolean;
  onClose: () => void;
  onSay: (t: string) => void;
  onWear: (id: string) => void;
  onFav: (id: string) => void;
  onOpenCards: () => void;
}) {
  const { popup } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={props.onClose}>
      <div className="pop-in crayon w-full max-w-[400px] bg-[var(--paper)] p-4 text-center" onClick={(e) => e.stopPropagation()}>
        {(popup.kind === "hat" || popup.kind === "hatInfo") && <HatPopup {...props} id={popup.id} reason={popup.kind === "hat" ? popup.reason : null} />}
        {(popup.kind === "card" || popup.kind === "cardInfo") && <CardPopup {...props} id={popup.id} isNew={popup.kind === "card"} />}
      </div>
    </div>
  );
}

function HatPopup({ id, reason, look, season, isFav, onClose, onSay, onWear, onFav }: { id: string; reason: string | null; look: Look; season: Season; isFav: boolean; onClose: () => void; onSay: (t: string) => void; onWear: (id: string) => void; onFav: (id: string) => void }) {
  const h = HAT_BY_ID[id];
  return (
    <>
      {reason && <div className="title-font text-[1.3em] text-[var(--orange-d)]">あたらしい ぼうし！</div>}
      {reason && <div className="text-[0.85em] text-[var(--ink-soft)]">{reason}</div>}
      <button type="button" className="tile mx-auto block w-[220px]" onClick={() => onSay(h.voice)} aria-label="こえを きく">
        <Sensei hatId={id} outfitId={look.outfit} itemId="item_none" face="happy" season={season} className="h-auto w-full" />
      </button>
      <div className="text-[1.4em] font-black">{h.name}</div>
      <div className="text-[0.85em]">
        <span className="text-[#e9a92a]">{"★".repeat(h.rarity)}</span>
        <span className="text-[#ddd]">{"★".repeat(5 - h.rarity)}</span> {RARITY_LABEL[h.rarity]}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onWear(id)} className="btn crayon bg-[var(--yellow)] text-[1.05em] font-bold">
          <span className="emoji">🎩</span> かぶる
        </button>
        {reason ? (
          <button type="button" onClick={onClose} className="btn crayon bg-white text-[1.05em] font-bold">
            やったね！
          </button>
        ) : (
          <button type="button" onClick={() => onFav(id)} className="btn crayon bg-white text-[1.05em] font-bold" aria-pressed={isFav}>
            <span className="emoji">{isFav ? "💛" : "🤍"}</span> おきにいり
          </button>
        )}
      </div>
      {!reason && (
        <button type="button" onClick={onClose} className="btn mt-2 w-full font-bold text-[var(--ink-soft)]">
          とじる
        </button>
      )}
    </>
  );
}

function CardPopup({ id, isNew, onClose, onSay, onOpenCards }: { id: string; isNew: boolean; onClose: () => void; onSay: (t: string) => void; onOpenCards: () => void }) {
  const c = CARDS.find((x) => x.id === id)!;
  return (
    <>
      {isNew && <div className="title-font text-[1.2em] text-[var(--pink-d)]">カードが ふえたよ！</div>}
      <div className="crayon mx-auto mt-2 flex w-[260px] flex-col items-center gap-2 p-4" style={{ background: c.color }}>
        <span className="text-[0.75em] font-bold opacity-70">CARD {c.no}</span>
        <span className="emoji text-[4em]">{c.emoji}</span>
        <span className="title-font text-[1.3em]">{c.title}</span>
        {!isNew && <p className="text-left text-[0.95em] leading-relaxed">{c.body}</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {isNew ? (
          <>
            <button type="button" onClick={onOpenCards} className="btn crayon bg-[var(--yellow)] font-bold">
              みてみる
            </button>
            <button type="button" onClick={onClose} className="btn crayon bg-white font-bold">
              あとで
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onSay(c.body)} className="btn crayon bg-[var(--yellow)] font-bold">
              <span className="emoji">🔊</span> よんで
            </button>
            <button type="button" onClick={onClose} className="btn crayon bg-white font-bold">
              とじる
            </button>
          </>
        )}
      </div>
    </>
  );
}


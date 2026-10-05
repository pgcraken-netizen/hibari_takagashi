/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Room from "./Room";
import SenseiArt from "./SenseiArt";
import Emo from "./Emo";
import Title, { type TitleAction } from "./Title";
import { HATS, HAT_BY_ID, HAT_CATEGORIES, RARITY_LABEL, type HatCategory } from "@/data/hats";
import { OUTFITS } from "@/data/outfits";
import { CARDS, ITEMS, OFFICIAL_LINKS, REACTIONS, TAP_SENSEI, greetingByHour, type Face } from "@/data/content";
import { SEASONS, SEASON_ORDER, seasonOf, type Season } from "@/data/seasons";
import { ALL_FOODS, foodSrc, hatSrc, roomSrc, type Food } from "@/lib/art";
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

type Screen = "title" | "room" | "gohan" | "kisekae" | "zukan" | "cards" | "kisetsu" | "about" | "settings";

type Popup =
  | { kind: "hat"; id: string; reason: string }
  | { kind: "card"; id: string }
  | { kind: "hatInfo"; id: string }
  | { kind: "cardInfo"; id: string }
  | { kind: "photo"; id: string };

const NAV: { id: Screen; icon: string; label: string }[] = [
  { id: "room", icon: "🏡", label: "へや" },
  { id: "kisekae", icon: "👒", label: "きせかえ" },
  { id: "gohan", icon: "🍙", label: "ごはん" },
  { id: "zukan", icon: "📖", label: "ずかん" },
  { id: "cards", icon: "🃏", label: "カード" },
  { id: "kisetsu", icon: "🌸", label: "きせつ" },
];

const SCREEN_TITLE: Record<Screen, string> = {
  title: "",
  room: "先生のへや",
  gohan: "ごはんタイム",
  kisekae: "きせかえ",
  zukan: "ぼうしずかん",
  cards: "カードコレクション",
  kisetsu: "季節のへや",
  about: "先生のことを知る",
  settings: "せってい",
};

const TOTAL = HATS.length;
const hatByName = (n: string) => HATS.find((h) => h.name === n)?.id ?? HATS[0].id;

/* カードの絵（先生の着せ替え） */
const CARD_ART: Record<string, { hat: string; outfit: string }> = {
  card_001: { hat: hatByName("てんとうむし"), outfit: "outfit_002" },
  card_002: { hat: hatByName("おいしゃさん"), outfit: "outfit_008" },
  card_003: { hat: hatByName("おうち"), outfit: "outfit_008" },
  card_004: { hat: hatByName("うりずんのおうち"), outfit: "outfit_006" },
  card_005: { hat: hatByName("よつばのクローバー"), outfit: "outfit_006" },
  card_006: { hat: hatByName("ふれあいまつり"), outfit: "outfit_004" },
  card_007: { hat: hatByName("ひばりのクリニック"), outfit: "outfit_008" },
  card_008: { hat: hatByName("がっこうのせんせい"), outfit: "outfit_007" },
  card_009: { hat: hatByName("ぎょうざ"), outfit: "outfit_001" },
  card_010: { hat: hatByName("スマイル"), outfit: "outfit_006" },
  card_011: { hat: hatByName("まほうのぼうし"), outfit: "outfit_009" },
  card_012: { hat: hatByName("ちいさいかんむり"), outfit: "outfit_009" },
};

/* ほんものの先生（写真）。その帽子を見つけるとひらく */
const PHOTOS = [
  { id: "photo_smile", src: "/art/photo-smile.jpg", hat: hatByName("スマイル"), title: "にこにこぼうしの先生", body: "この帽子、ほんとうに かぶったことが あるんだって！ イベントで みんなと いっしょに たのしんでいます。" },
  { id: "photo_ladybug", src: "/art/photo-ladybug.jpg", hat: hatByName("てんとうむし"), title: "てんとうむしぼうしの先生", body: "てんとうむしと ハチと クローバーの帽子。先生が書いた本『うりずんの風に吹かれて』を もっているよ。" },
];

export default function GameApp() {
  const [save, setSave] = useState<SaveData | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [face, setFace] = useState<Face>("smile");
  const [bubble, setBubble] = useState<string | null>(null);
  const [motion, setMotion] = useState("hop");
  const [motionKey, setMotionKey] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [viewSeason, setViewSeason] = useState<Season>("spring");
  const [omakaseDone, setOmakaseDone] = useState(false);
  const [eating, setEating] = useState<{ slot: number; key: number } | null>(null);
  const [tableFoods, setTableFoods] = useState<Food[]>([]);
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
    setTableFoods(ALL_FOODS.filter((f) => f.season === season));
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
        queue.push({ kind: "hat", id: newHat, reason: "きょうの ぼうしが とどいたよ！" });
        CARDS.forEach((c) => {
          const at = Math.min(c.unlockAt, TOTAL);
          if (before < at && s.found.length >= at) queue.push({ kind: "card", id: c.id });
        });
      }
    }
    setSave(s);
    setPopups(queue);
    setBubble(`${greetingByHour(new Date().getHours())} ${dailyMessage(today)}`);
    const t = timers.current;
    return () => t.forEach((x) => window.clearTimeout(x));
  }, []);

  useEffect(() => {
    if (save) writeSave(save);
  }, [save]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!save) return;
    if (save.settings.bgm) startBgm();
    else stopBgm();
    return () => stopBgm();
  }, [save?.settings.bgm]); // eslint-disable-line react-hooks/exhaustive-deps

  const settings = save?.settings;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** 操作を「受け止める」反応（評価はしない） */
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

  const eat = (slot: number, foods: Food[]) => {
    const f = foods[slot];
    if (!f) return;
    setEating({ slot, key: Date.now() });
    react("いただきます！", "yummy", "chew", "eat");
    later(() => react(`もぐもぐ… ${f.name}、おいしい！`, "happy", "hop", null), 1300);
    later(() => setEating(null), 1500);
    update((s) => {
      const taps = s.foodTaps + 1;
      if (taps % 4 === 0) {
        const n = pickNewHat(new Set(s.found), viewSeason);
        if (n) later(() => update((x) => discover(x, n, "ごちそうさまの おれいに もらったよ！")), 2400);
      }
      return { ...s, foodTaps: taps };
    });
  };

  const serve = (f: Food) => {
    // ごはんタイム：えらんだものをテーブルのまんなかへ
    const next = [...tableFoods];
    next[1] = f;
    setTableFoods(next);
    later(() => eat(1, next), 250);
  };

  const omakase = () => {
    if (!save) return;
    const { outfit, item } = randomLookParts();
    const r = omakaseHat(new Set(save.found), save.sinceNew, viewSeason);
    const bg = pick(SEASON_ORDER);
    react("せーの…", "surprise", "shuffle", "omakase", false);
    later(() => {
      setViewSeason(bg);
      setTableFoods(ALL_FOODS.filter((x) => x.season === bg));
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
    if (sc === "gohan") {
      setTableFoods(ALL_FOODS.filter((x) => x.season === viewSeason));
      later(() => react("おなか すいたね。なに たべようかな？", "smile", "hop", null), 80);
    }
  };

  const onTitle = (a: TitleAction) => {
    if (a === "omakase") {
      goto("room");
      later(omakase, 350);
    } else goto(a);
  };

  const closePopup = () => setPopups((p) => p.slice(1));

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
        <div className="font-hand text-2xl">よみこみちゅう…</div>
      </div>
    );
  }

  const found = new Set(save.found);
  const newCardCount = CARDS.filter((c) => save.found.length >= Math.min(c.unlockAt, TOTAL) && !save.seenCards.includes(c.id)).length;
  const roomProps = { look: save.look, season: viewSeason, face, bubble, motion, motionKey, onTapSensei: tapSensei };

  return (
    <div className={`app ${settings.bigText ? "big-text" : ""} ${settings.animation ? "anim" : "no-anim"} mx-auto flex min-h-dvh max-w-[520px] flex-col`}>
      {screen === "title" ? (
        <Title onAction={onTitle} found={save.found.length} total={TOTAL} />
      ) : (
        <>
          <header className="sticky top-0 z-30 flex items-center gap-2 bg-[var(--cream)]/90 px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-sm">
            <button type="button" onClick={() => goto("title")} className="btn circle circle-white h-[52px] w-[52px] min-h-0" aria-label="タイトルへ">
              <Emo e="🏠" size="1.8em" />
            </button>
            <h1 className="font-hand flex-1 truncate text-[1.35em] leading-tight">{SCREEN_TITLE[screen]}</h1>
            <div className="chip font-hand" aria-label={`ぼうし ${save.found.length}こ`}>
              <Emo e="👒" size="1.3em" /> {save.found.length}/{TOTAL}
            </div>
            <button type="button" onClick={() => goto("settings")} className="btn circle circle-blue h-[52px] w-[52px] min-h-0" aria-label="せってい">
              <Emo e="⚙️" size="1.7em" />
            </button>
          </header>

          <main className="flex-1 px-3 pb-32 pt-1">
            {screen === "room" && (
              <RoomScreen
                roomProps={roomProps}
                foods={tableFoods}
                eating={eating}
                onEat={(i) => eat(i, tableFoods)}
                season={viewSeason}
                realSeason={realSeason}
                omakaseDone={omakaseDone}
                onOmakase={omakase}
                onGo={goto}
                onBackSeason={() => {
                  setViewSeason(realSeason);
                  setTableFoods(ALL_FOODS.filter((x) => x.season === realSeason));
                  react(SEASONS[realSeason].greeting, "smile", "hop");
                }}
              />
            )}
            {screen === "gohan" && <Gohan roomProps={roomProps} foods={tableFoods} eating={eating} onEat={(i) => eat(i, tableFoods)} onServe={serve} />}
            {screen === "kisekae" && (
              <Kisekae
                roomProps={roomProps}
                save={save}
                found={found}
                season={viewSeason}
                voiceMode={settings.voiceMode}
                onWear={wear}
                onDiscover={(id) => update((s) => discover({ ...s, look: { ...s.look, hat: id } }, id, "ぼうしばこから でてきた！"))}
                onLocked={() => react("まだ みつけてないよ。どこにあるかな？", "surprise", "wiggle")}
                onOmakase={omakase}
              />
            )}
            {screen === "zukan" && <Zukan found={found} favorites={save.favorites} onOpen={(id) => setPopups((p) => [{ kind: "hatInfo", id }, ...p])} onLocked={() => settings.voice && speak("まだ ひみつ！")} />}
            {screen === "cards" && (
              <Cards
                count={save.found.length}
                found={found}
                seen={save.seenCards}
                season={viewSeason}
                onOpen={(id) => {
                  setPopups((p) => [{ kind: "cardInfo", id }, ...p]);
                  update((s) => (s.seenCards.includes(id) ? s : { ...s, seenCards: [...s.seenCards, id] }));
                  if (settings.voice) speak(CARDS.find((c) => c.id === id)!.title);
                  if (settings.sfx) playSfx("card");
                }}
                onPhoto={(id) => {
                  setPopups((p) => [{ kind: "photo", id }, ...p]);
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
                  setTableFoods(ALL_FOODS.filter((x) => x.season === s));
                  goto("room");
                  later(() => react(SEASONS[s].greeting, "smile", "hop"), 60);
                }}
              />
            )}
            {screen === "about" && <About onSay={(t) => settings.voice && speak(t)} found={found} onPhoto={(id) => setPopups((p) => [{ kind: "photo", id }, ...p])} />}
            {screen === "settings" && (
              <SettingsScreen
                settings={settings}
                onChange={updateSettings}
                onReset={() => {
                  if (window.confirm("あそんだ きろくを ぜんぶ けしますか？（もとに もどせません）")) {
                    localStorage.clear();
                    location.reload();
                  }
                }}
              />
            )}
          </main>

          <nav className="nav safe-bottom fixed inset-x-0 bottom-0 z-30" aria-label="メニュー">
            <ul className="mx-auto grid max-w-[520px] grid-cols-6 px-1">
              {NAV.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => goto(n.id)}
                    aria-current={screen === n.id ? "page" : undefined}
                    className={`tile nav-btn relative flex min-h-[68px] w-full flex-col items-center justify-center ${screen === n.id ? "nav-on" : ""}`}
                  >
                    <Emo e={n.icon} size="2em" />
                    <span className="font-hand text-[0.72em] leading-tight">{n.label}</span>
                    {n.id === "cards" && newCardCount > 0 && <span className="badge-new absolute right-1 top-1">NEW</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}

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
            setScreen("room");
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

type RoomProps = {
  look: Look;
  season: Season;
  face: Face;
  bubble: string | null;
  motion: string;
  motionKey: number;
  onTapSensei: () => void;
};

/* =========================================================
 * 先生のへや
 * ========================================================= */

function RoomScreen(props: {
  roomProps: RoomProps;
  foods: Food[];
  eating: { slot: number; key: number } | null;
  onEat: (i: number) => void;
  season: Season;
  realSeason: Season;
  omakaseDone: boolean;
  onOmakase: () => void;
  onGo: (s: Screen) => void;
  onBackSeason: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="frame">
        <Room {...props.roomProps} foods={props.foods} eating={props.eating} onTapFood={props.onEat} />
      </div>
      {props.season !== props.realSeason && (
        <button type="button" onClick={props.onBackSeason} className="btn pill pill-white text-[0.95em]" style={{ minHeight: 48 }}>
          <Emo e={SEASONS[props.season].icon} /> いまは「{SEASONS[props.season].label}」のへや → いまのきせつに もどる
        </button>
      )}
      <button type="button" onClick={props.onOmakase} className="btn pill pill-yellow text-[1.45em]">
        <Emo e={props.omakaseDone ? "🔁" : "⭐"} size="1.5em" />
        {props.omakaseDone ? "もう一回！" : "先生をおまかせ！"}
      </button>
      <div className="grid grid-cols-4 gap-2">
        <RoundButton color="pink" e="👒" label="きせかえ" onClick={() => props.onGo("kisekae")} />
        <RoundButton color="green" e="🍙" label="ごはん" onClick={() => props.onGo("gohan")} />
        <RoundButton color="orange" e="🌸" label="きせつ" onClick={() => props.onGo("kisetsu")} />
        <RoundButton color="blue" e="📕" label="先生のこと" onClick={() => props.onGo("about")} />
      </div>
      <p className="font-hand text-center text-[0.9em] text-[var(--ink-soft)]">
        <Emo e="👆" /> 先生や テーブルの ごはんを タップしてね
      </p>
    </div>
  );
}

function RoundButton({ color, e, label, onClick, badge }: { color: string; e: string; label: string; onClick: () => void; badge?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`btn round-btn round-${color} relative`}>
      {badge && <span className="badge-new absolute right-0 top-0">NEW</span>}
      <Emo e={e} size="2.1em" />
      <span className="font-hand text-[0.8em] leading-tight">{label}</span>
    </button>
  );
}

/* =========================================================
 * ごはんタイム
 * ========================================================= */

function Gohan({ roomProps, foods, eating, onEat, onServe }: { roomProps: RoomProps; foods: Food[]; eating: { slot: number; key: number } | null; onEat: (i: number) => void; onServe: (f: Food) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="frame">
        <Room {...roomProps} foods={foods} eating={eating} onTapFood={onEat} />
      </div>
      <section className="card-paper p-3">
        <h2 className="font-hand mb-2 text-[1.15em]">
          <Emo e="🍽️" /> メニュー（えらぶと 先生が たべるよ）
        </h2>
        {SEASON_ORDER.map((s) => (
          <div key={s} className="mb-2">
            <div className="font-hand text-[0.85em] text-[var(--ink-soft)]">
              <Emo e={SEASONS[s].icon} /> {SEASONS[s].label}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FOODS.filter((f) => f.season === s).map((f) => (
                <button key={f.art} type="button" onClick={() => onServe(f)} className="tile food-tile" aria-label={`${f.name}を たべてもらう`}>
                  <img src={foodSrc(f.art)} alt="" className="w-full" draggable={false} />
                  <span className="font-hand text-[0.8em]">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* =========================================================
 * きせかえ
 * ========================================================= */

function Kisekae(props: {
  roomProps: RoomProps;
  save: SaveData;
  found: Set<string>;
  season: Season;
  voiceMode: boolean;
  onWear: (p: Partial<Look>, line: string) => void;
  onDiscover: (id: string) => void;
  onLocked: () => void;
  onOmakase: () => void;
}) {
  const { save, found } = props;
  const [tab, setTab] = useState<"hat" | "outfit" | "item">("hat");
  const [cat, setCat] = useState<HatCategory | "fav">(HAT_BY_ID[save.look.hat]?.category ?? "food");

  const recs = useMemo(() => {
    const rnd = seededRandom(hashString("rec" + todayKey() + save.found.length));
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
      <div className="sticky top-[70px] z-20 -mx-3 bg-[var(--cream)]/95 px-3 pb-2 pt-1 backdrop-blur-sm">
        <div className="frame">
          <Room {...props.roomProps} mode="upper" />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(
            [
              ["hat", "👒", "ぼうし"],
              ["outfit", "👔", "ふく"],
              ["item", "🎈", "こもの"],
            ] as const
          ).map(([id, icon, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={`btn tab-btn ${tab === id ? "tab-on" : ""}`}>
              <Emo e={icon} size="1.7em" />
              <span className="font-hand">{label}</span>
            </button>
          ))}
          <button type="button" onClick={props.onOmakase} className="btn tab-btn tab-pink">
            <Emo e="⭐" size="1.7em" />
            <span className="font-hand">おまかせ</span>
          </button>
        </div>
      </div>

      {tab === "hat" && (
        <>
          <section>
            <h2 className="font-hand mb-1 text-[1.05em]">
              <Emo e="✨" /> おすすめ 3つ
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {recs.own.map((id) => (
                <HatTile key={id} id={id} selected={save.look.hat === id} onClick={() => props.onWear({ hat: id }, voiceLine(HAT_BY_ID[id].name, HAT_BY_ID[id].voice))} />
              ))}
              {recs.box && (
                <button type="button" onClick={() => props.onDiscover(recs.box!)} className="btn tile hat-tile tile-gift" aria-label="ぼうしばこを あける">
                  <Emo e="🎁" size="3.2em" className="gift-bounce" />
                  <span className="font-hand text-[0.85em]">ぼうしばこ</span>
                </button>
              )}
              {Array.from({ length: Math.max(0, 3 - recs.own.length - (recs.box ? 1 : 0)) }).map((_, i) => (
                <div key={i} className="hat-tile font-hand flex items-center justify-center text-[0.8em] text-[var(--ink-soft)]">
                  あつめよう
                </div>
              ))}
            </div>
          </section>

          <div className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 py-1">
            {[...HAT_CATEGORIES, { id: "fav" as const, label: "おきにいり", icon: "💛" }].map((c) => (
              <button key={c.id} type="button" onClick={() => setCat(c.id)} aria-pressed={cat === c.id} className={`tile chip-btn font-hand ${cat === c.id ? "chip-on" : ""}`}>
                <Emo e={c.icon} size="1.4em" />
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {list.map((h) =>
              found.has(h.id) ? (
                <HatTile key={h.id} id={h.id} selected={save.look.hat === h.id} onClick={() => props.onWear({ hat: h.id }, voiceLine(h.name, h.voice))} showName />
              ) : (
                <button key={h.id} type="button" onClick={props.onLocked} className="tile hat-tile" aria-label="まだ みつけていない ぼうし">
                  <img src={hatSrc(h.id)} alt="" className="silhouette w-[92%]" draggable={false} loading="lazy" />
                  <span className="font-hand text-[0.75em] text-[var(--ink-soft)]">？？？</span>
                </button>
              ),
            )}
            {list.length === 0 && <p className="font-hand col-span-3 py-6 text-center text-[var(--ink-soft)]">ずかんで 💛 をつけると、ここに ならぶよ</p>}
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
              className={`tile outfit-tile ${save.look.outfit === o.id ? "tile-on" : ""}`}
            >
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1 / 0.82" }}>
                <div className="absolute left-[-8%] w-[116%]" style={{ top: "-66%" }}>
                  <SenseiArt hat={null} outfit={o.id} season={props.season} showFx={false} />
                </div>
              </div>
              <span className="font-hand block pb-1 text-[0.85em]">{o.name}</span>
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
              className={`tile hat-tile ${save.look.item === it.id ? "tile-on" : ""}`}
            >
              <Emo e={it.emoji} size="3em" />
              <span className="font-hand text-[0.8em]">{it.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HatTile({ id, selected, onClick, showName }: { id: string; selected?: boolean; onClick: () => void; showName?: boolean }) {
  const h = HAT_BY_ID[id];
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} aria-label={`${h.name}のぼうし`} className={`tile hat-tile ${selected ? "tile-on" : ""}`}>
      <img src={hatSrc(id)} alt="" className="w-[96%]" draggable={false} loading="lazy" />
      {showName && <span className="font-hand px-1 text-center text-[0.74em] leading-tight">{h.name}</span>}
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
      <div className="card-paper p-3">
        <div className="flex items-end justify-between">
          <span className="font-hand text-[1.8em] leading-none">
            {n} <span className="text-[0.55em]">/ {TOTAL} こ</span>
          </span>
          <span className="font-hand text-[0.85em] text-[var(--ink-soft)]">{n < TOTAL ? `あと ${TOTAL - n}こ。ゆっくり あつめよう` : "ぜんぶ みつけた！"}</span>
        </div>
        <div className="progress mt-2">
          <div style={{ width: `${(n / TOTAL) * 100}%` }} />
        </div>
      </div>

      {HAT_CATEGORIES.map((c) => {
        const hats = HATS.filter((h) => h.category === c.id);
        const got = hats.filter((h) => found.has(h.id)).length;
        return (
          <section key={c.id}>
            <h2 className="font-hand mb-1 flex items-center justify-between text-[1.05em]">
              <span>
                <Emo e={c.icon} size="1.3em" /> {c.label}
              </span>
              <span className="text-[0.85em] text-[var(--ink-soft)]">
                {got} / {hats.length}
              </span>
            </h2>
            <div className="grid grid-cols-4 gap-1.5">
              {hats.map((h) =>
                found.has(h.id) ? (
                  <button key={h.id} type="button" onClick={() => onOpen(h.id)} className="tile zukan-tile relative" aria-label={h.name}>
                    <img src={hatSrc(h.id)} alt="" className="w-full" loading="lazy" draggable={false} />
                    {favorites.includes(h.id) && <Emo e="💛" size="1.1em" className="absolute right-1 top-1" />}
                  </button>
                ) : (
                  <button key={h.id} type="button" onClick={onLocked} className="tile zukan-tile zukan-locked" aria-label="まだ みつけていない">
                    <img src={hatSrc(h.id)} alt="" className="silhouette w-full" loading="lazy" draggable={false} />
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

function CardArt({ id, season }: { id: string; season: Season }) {
  const a = CARD_ART[id];
  return (
    <div className="relative w-full overflow-hidden rounded-[14px] bg-[#fff6e6]" style={{ aspectRatio: "1 / 1" }}>
      <img src={roomSrc(season)} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-80" draggable={false} />
      <div className="absolute left-[-6%] w-[112%]" style={{ top: "-4%" }}>
        <SenseiArt hat={a.hat} outfit={a.outfit} season={season} showFx={false} />
      </div>
    </div>
  );
}

function Cards({ count, found, seen, season, onOpen, onPhoto }: { count: number; found: Set<string>; seen: string[]; season: Season; onOpen: (id: string) => void; onPhoto: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-hand text-[0.95em] text-[var(--ink-soft)]">ぼうしを みつけると、先生のことが すこしずつ わかるよ。</p>
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((c) => {
          const at = Math.min(c.unlockAt, TOTAL);
          const open = count >= at;
          return open ? (
            <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="tile game-card relative" style={{ background: c.color }}>
              {!seen.includes(c.id) && <span className="badge-new absolute right-2 top-2 z-10">NEW</span>}
              <span className="font-hand text-[0.7em] opacity-70">CARD {c.no}</span>
              <CardArt id={c.id} season={season} />
              <span className="font-hand text-[1em] leading-tight">{c.title}</span>
            </button>
          ) : (
            <div key={c.id} className="game-card game-card-locked">
              <span className="font-hand text-[0.7em] opacity-60">CARD {c.no}</span>
              <div className="flex aspect-square w-full items-center justify-center rounded-[14px] bg-white/50">
                <Emo e="❓" size="3.5em" className="opacity-40" />
              </div>
              <span className="font-hand text-[0.8em] text-[var(--ink-soft)]">
                あと <b>{at - count}</b>こ ぼうしを みつけると…
              </span>
            </div>
          );
        })}
      </div>

      <section className="card-paper mt-2 p-3">
        <h2 className="font-hand text-[1.15em]">
          <Emo e="📸" size="1.3em" /> ほんものの先生カード
        </h2>
        <p className="font-hand text-[0.85em] text-[var(--ink-soft)]">おなじ ぼうしを みつけると、ほんものの 写真が ひらくよ。</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {PHOTOS.map((p) =>
            found.has(p.hat) ? (
              <button key={p.id} type="button" onClick={() => onPhoto(p.id)} className="tile polaroid">
                <img src={p.src} alt={p.title} className="aspect-[3/4] w-full object-cover" />
                <span className="font-hand text-[0.85em]">{p.title}</span>
              </button>
            ) : (
              <div key={p.id} className="polaroid polaroid-locked">
                <div className="flex aspect-[3/4] w-full items-center justify-center bg-[#eadfcf]">
                  <img src={hatSrc(p.hat)} alt="" className="silhouette w-[80%]" />
                </div>
                <span className="font-hand text-[0.8em] text-[var(--ink-soft)]">この ぼうしを みつけてね</span>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

/* =========================================================
 * 季節のへや
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
            className={`tile season-tile ${sel === id ? "tile-on" : ""}`}
          >
            <img src={roomSrc(id)} alt="" className="aspect-square w-full rounded-[12px] object-cover object-[0%_25%]" draggable={false} />
            <span className="font-hand relative">
              {SEASONS[id].label}
              {id === realSeason && <span className="badge-new absolute -right-9 -top-1">いま</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="card-paper overflow-hidden p-3">
        <h2 className="font-hand text-[1.4em]">
          <Emo e={s.icon} size="1.3em" /> {s.label}のへや
        </h2>
        <p className="font-hand">{s.greeting}</p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {s.things.map((t, i) => (
            <button key={i} type="button" onClick={() => onSay(t.name)} className="tile flex flex-col items-center rounded-2xl bg-white/70 p-1">
              <Emo e={t.emoji} size="2.4em" />
              <span className="font-hand text-[0.62em] leading-tight">{t.name}</span>
            </button>
          ))}
        </div>
        <h3 className="font-hand mt-3">
          <Emo e="🍽️" /> {s.label}の テーブル
        </h3>
        <div className="mt-1 grid grid-cols-3 gap-2 rounded-2xl bg-[#f6e2c4]/70 p-2">
          {s.table.map((t) => (
            <button key={t.name} type="button" onClick={() => onSay(t.name)} className="tile flex flex-col items-center">
              <img src={foodSrc(t.art)} alt="" className="w-full" />
              <span className="font-hand text-[0.75em]">{t.name}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onUse(sel)} className="btn pill pill-green mt-3 w-full text-[1.15em]">
          <Emo e="🏡" size="1.4em" /> {s.label}のへやで あそぶ
        </button>
      </div>

      <section>
        <h2 className="font-hand mb-1 text-[1.05em]">
          <Emo e="👒" /> {s.label}の ぼうし
        </h2>
        <div className="grid grid-cols-4 gap-1.5">
          {hats.map((h) => (
            <div key={h.id} className={`zukan-tile ${found.has(h.id) ? "" : "zukan-locked"}`}>
              <img src={hatSrc(h.id)} alt="" className={`w-full ${found.has(h.id) ? "" : "silhouette"}`} loading="lazy" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* =========================================================
 * 先生のことを知る
 * ========================================================= */

function About({ onSay, found, onPhoto }: { onSay: (t: string) => void; found: Set<string>; onPhoto: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="card-paper flex items-center gap-3 p-3">
        <img src="/art/portrait.webp" alt="高橋先生のイラスト" className="w-[44%] shrink-0 rounded-[18px] border-[3px] border-[var(--ink)]" />
        <div>
          <h2 className="font-hand text-[1.3em] leading-tight">高橋先生って、どんなひと？</h2>
          <button
            type="button"
            onClick={() => onSay("たかはし せんせいは、こどもの おいしゃさん。うりずん という ばしょを つくったよ。")}
            className="btn pill pill-yellow mt-2 px-3 text-[0.95em]"
            style={{ minHeight: 52 }}
          >
            <Emo e="🔊" /> きいてみる
          </button>
        </div>
      </div>

      <section className="card-paper p-4 leading-relaxed">
        <p className="font-hand text-[1.05em]">
          <Emo e="🩺" /> <b>子どもの おいしゃさん</b>。びょういんだけでなく、おうちにも みに いきます。
        </p>
        <p className="font-hand mt-2 text-[1.05em]">
          <Emo e="🌱" /> おもい しょうがいの ある 子どもと かぞくが、たのしく あんしんして すごせる ばしょ <b>「うりずん」</b>を つくりました。
        </p>
        <p className="font-hand mt-2 text-[1.05em]">
          <Emo e="👒" /> イベントでは、てんとうむしや にこにこの ぼうしを かぶって とうじょう することも！
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {PHOTOS.map((p) =>
          found.has(p.hat) ? (
            <button key={p.id} type="button" onClick={() => onPhoto(p.id)} className="tile polaroid">
              <img src={p.src} alt={p.title} className="aspect-[3/4] w-full object-cover" />
              <span className="font-hand text-[0.85em]">{p.title}</span>
            </button>
          ) : (
            <div key={p.id} className="polaroid polaroid-locked">
              <div className="flex aspect-[3/4] w-full items-center justify-center bg-[#eadfcf]">
                <img src={hatSrc(p.hat)} alt="" className="silhouette w-[80%]" />
              </div>
              <span className="font-hand text-[0.8em] text-[var(--ink-soft)]">ぼうしを みつけると ひらくよ</span>
            </div>
          ),
        )}
      </section>

      <section className="card-paper bg-[#eaf6ff] p-4">
        <h2 className="font-hand text-[1.1em]">
          <Emo e="👨‍👩‍👧" /> おとなの かたへ
        </h2>
        <p className="mt-1 text-[0.92em] leading-relaxed">
          宇都宮市で小児科・在宅医療に携わり、認定NPO法人うりずんの理事長を務める髙橋昭彦先生。うりずんでは、重い障がいのある子どもと家族のために、日中活動・児童発達支援・放課後等デイサービス・訪問支援・相談支援などを行っています。
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {OFFICIAL_LINKS.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn pill pill-white justify-between px-4 text-[1em]" style={{ minHeight: 54 }}>
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
      {rows.map((r) => {
        const on = settings[r.key];
        return (
          <button key={r.key} type="button" role="switch" aria-checked={on} onClick={() => onChange({ [r.key]: !on })} className={`btn setting-row ${on ? "setting-on" : ""}`}>
            <Emo e={r.icon} size="2em" />
            <span className="flex-1 text-left">
              <span className="font-hand block text-[1.05em]">{r.label}</span>
              {r.note && <span className="block text-[0.75em] text-[var(--ink-soft)]">{r.note}</span>}
            </span>
            <span className={`toggle ${on ? "toggle-on" : ""}`}>{on ? "ON" : "OFF"}</span>
          </button>
        );
      })}
      <p className="text-[0.8em] leading-relaxed text-[var(--ink-soft)]">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3a2a1f]/45 p-4" role="dialog" aria-modal="true" onClick={props.onClose}>
      <div className="pop-in card-paper max-h-[92dvh] w-full max-w-[400px] overflow-y-auto p-4 text-center" onClick={(e) => e.stopPropagation()}>
        {(popup.kind === "hat" || popup.kind === "hatInfo") && <HatPopup {...props} id={popup.id} reason={popup.kind === "hat" ? popup.reason : null} />}
        {(popup.kind === "card" || popup.kind === "cardInfo") && <CardPopup {...props} id={popup.id} isNew={popup.kind === "card"} />}
        {popup.kind === "photo" && <PhotoPopup id={popup.id} onClose={props.onClose} onSay={props.onSay} />}
      </div>
    </div>
  );
}

function HatPopup({ id, reason, look, season, isFav, onClose, onSay, onWear, onFav }: { id: string; reason: string | null; look: Look; season: Season; isFav: boolean; onClose: () => void; onSay: (t: string) => void; onWear: (id: string) => void; onFav: (id: string) => void }) {
  const h = HAT_BY_ID[id];
  return (
    <>
      {reason && <div className="font-hand text-[1.5em] text-[#e07f3a]">あたらしい ぼうし！</div>}
      {reason && <div className="font-hand text-[0.9em] text-[var(--ink-soft)]">{reason}</div>}
      <button type="button" className="tile relative mx-auto mt-1 block w-full overflow-hidden rounded-[18px]" onClick={() => onSay(h.voice)} aria-label="こえを きく">
        <img src={roomSrc(season)} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
        <div className="relative mx-auto w-[86%] pt-1">
          <SenseiArt hat={id} outfit={look.outfit} season={season} face="happy" />
        </div>
      </button>
      <div className="font-hand mt-2 text-[1.6em] leading-tight">{h.name}</div>
      <div className="font-hand text-[0.9em]">
        <span className="text-[#e9a92a]">{"★".repeat(h.rarity)}</span>
        <span className="text-[#ddd]">{"★".repeat(5 - h.rarity)}</span> {RARITY_LABEL[h.rarity]}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onWear(id)} className="btn pill pill-yellow text-[1.1em]">
          <Emo e="👒" size="1.4em" /> かぶる
        </button>
        {reason ? (
          <button type="button" onClick={onClose} className="btn pill pill-white text-[1.1em]">
            やったね！
          </button>
        ) : (
          <button type="button" onClick={() => onFav(id)} className="btn pill pill-white text-[1.05em]" aria-pressed={isFav}>
            <Emo e={isFav ? "💛" : "🤍"} size="1.3em" /> おきにいり
          </button>
        )}
      </div>
      {!reason && (
        <button type="button" onClick={onClose} className="btn font-hand mt-2 w-full text-[var(--ink-soft)]">
          とじる
        </button>
      )}
    </>
  );
}

function CardPopup({ id, isNew, season, onClose, onSay, onOpenCards }: { id: string; isNew: boolean; season: Season; onClose: () => void; onSay: (t: string) => void; onOpenCards: () => void }) {
  const c = CARDS.find((x) => x.id === id)!;
  return (
    <>
      {isNew && <div className="font-hand text-[1.4em] text-[#d9707f]">カードが ふえたよ！</div>}
      <div className="game-card mx-auto mt-2 w-[86%]" style={{ background: c.color }}>
        <span className="font-hand text-[0.75em] opacity-70">CARD {c.no}</span>
        <CardArt id={c.id} season={season} />
        <span className="font-hand text-[1.4em]">{c.title}</span>
        {!isNew && <p className="font-hand text-left text-[1em] leading-relaxed">{c.body}</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {isNew ? (
          <>
            <button type="button" onClick={onOpenCards} className="btn pill pill-yellow">
              みてみる
            </button>
            <button type="button" onClick={onClose} className="btn pill pill-white">
              あとで
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onSay(c.body)} className="btn pill pill-yellow">
              <Emo e="🔊" /> よんで
            </button>
            <button type="button" onClick={onClose} className="btn pill pill-white">
              とじる
            </button>
          </>
        )}
      </div>
    </>
  );
}

function PhotoPopup({ id, onClose, onSay }: { id: string; onClose: () => void; onSay: (t: string) => void }) {
  const p = PHOTOS.find((x) => x.id === id)!;
  return (
    <>
      <div className="font-hand text-[1.3em]">ほんものの 先生！</div>
      <div className="polaroid mx-auto mt-2 w-[86%] rotate-[-2deg]">
        <img src={p.src} alt={p.title} className="w-full" />
        <span className="font-hand">{p.title}</span>
      </div>
      <p className="font-hand mt-3 text-left leading-relaxed">{p.body}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onSay(p.body)} className="btn pill pill-yellow">
          <Emo e="🔊" /> よんで
        </button>
        <button type="button" onClick={onClose} className="btn pill pill-white">
          とじる
        </button>
      </div>
    </>
  );
}

/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Emo from "./Emo";
import Title, { type TitleAction } from "./Title";
import Scene, { FULL_VIEW, HatFace, at, type View } from "./home/Scene";
import HomeScreen, { type HomeAction } from "./home/HomeScreen";
import { Header, Nav, px, type NavId } from "./home/Chrome";
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
  type Snap,
} from "@/lib/game";
import { playSfx, speak, startBgm, stopBgm, vibrate, type Sfx } from "@/lib/audio";

type Screen = "title" | "home" | "kisekae" | "zukan" | "cards" | "album" | "about" | "place" | "kisetsu" | "gohan" | "settings";

type Popup =
  | { kind: "hat"; id: string; reason: string }
  | { kind: "card"; id: string }
  | { kind: "hatInfo"; id: string }
  | { kind: "cardInfo"; id: string }
  | { kind: "photo"; id: string }
  | { kind: "snap"; index: number };

const TITLES: Record<Screen, { icon: string; label: string }> = {
  title: { icon: "", label: "" },
  home: { icon: "🏠", label: "ホーム" },
  kisekae: { icon: "👒", label: "着せ替え" },
  zukan: { icon: "⭐", label: "ぼうしコレクション" },
  cards: { icon: "🃏", label: "カード図鑑" },
  album: { icon: "📸", label: "アルバム" },
  about: { icon: "📕", label: "先生のこと" },
  place: { icon: "📍", label: "うりずんの場所" },
  kisetsu: { icon: "🗓️", label: "季節のへや" },
  gohan: { icon: "🍙", label: "ごはんタイム" },
  settings: { icon: "⚙️", label: "設定" },
};

const NAV_OF: Partial<Record<Screen, NavId>> = { home: "home", zukan: "collection", album: "album", about: "profile", place: "more" };

const TOTAL = HATS.length;
const hatByName = (n: string) => HATS.find((h) => h.name === n)?.id ?? HATS[0].id;

/* カードの絵（先生の着せ替え） */
const CARD_ART: Record<string, Look> = {
  card_001: { hat: hatByName("てんとうむし"), outfit: "outfit_002", item: "item_none" },
  card_002: { hat: hatByName("おいしゃさん"), outfit: "outfit_008", item: "item_none" },
  card_003: { hat: hatByName("おうち"), outfit: "outfit_008", item: "item_none" },
  card_004: { hat: hatByName("うりずんのおうち"), outfit: "outfit_006", item: "item_none" },
  card_005: { hat: hatByName("よつばのクローバー"), outfit: "outfit_006", item: "item_none" },
  card_006: { hat: hatByName("ふれあいまつり"), outfit: "outfit_004", item: "item_none" },
  card_007: { hat: hatByName("ひばりのクリニック"), outfit: "outfit_008", item: "item_none" },
  card_008: { hat: hatByName("がっこうのせんせい"), outfit: "outfit_007", item: "item_none" },
  card_009: { hat: hatByName("ぎょうざ"), outfit: "outfit_001", item: "item_none" },
  card_010: { hat: hatByName("スマイル"), outfit: "outfit_006", item: "item_none" },
  card_011: { hat: hatByName("まほうのぼうし"), outfit: "outfit_009", item: "item_none" },
  card_012: { hat: hatByName("ちいさいかんむり"), outfit: "outfit_009", item: "item_none" },
};
const CARD_VIEW: View = { y0: 250, y1: 820 };

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
  const [flash, setFlash] = useState(0);
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
          const at2 = Math.min(c.unlockAt, TOTAL);
          if (before < at2 && s.found.length >= at2) queue.push({ kind: "card", id: c.id });
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
      const at2 = Math.min(c.unlockAt, TOTAL);
      if (before < at2 && found.length >= at2) add.push({ kind: "card", id: c.id });
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
    const next = [...tableFoods];
    next[0] = f;
    setTableFoods(next);
    later(() => eat(0, next), 250);
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

  const takePhoto = () => {
    setFlash((f) => f + 1);
    if (settings?.sfx) playSfx("card");
    update((s) => ({ ...s, album: [{ ...s.look, season: viewSeason, date: todayKey() }, ...(s.album ?? [])].slice(0, 40) }));
    later(() => react("はい、チーズ！ アルバムに いれたよ。", "proud", "hop", null), 250);
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
    const map: Record<TitleAction, Screen> = { room: "home", kisekae: "kisekae", cards: "cards", about: "about", kisetsu: "kisetsu", gohan: "gohan", omakase: "home", settings: "settings" };
    goto(map[a]);
    if (a === "omakase") later(omakase, 350);
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
  const unlockedCards = CARDS.filter((c) => save.found.length >= Math.min(c.unlockAt, TOTAL));
  const newCardCount = unlockedCards.filter((c) => !save.seenCards.includes(c.id)).length;
  const hatList = [...save.found].reverse();
  const giftHat = pickNewHat(found, viewSeason, seededRandom(hashString("gift" + todayKey() + save.found.length)));
  const sceneProps = { look: save.look, season: viewSeason, face, motion, motionKey };

  const header = (
    <Header
      cards={unlockedCards.length}
      cardsTotal={CARDS.length}
      hats={save.found.length}
      hatsTotal={TOTAL}
      onLogo={() => goto("title")}
      onCards={() => goto("cards")}
      onHats={() => goto("zukan")}
      onSettings={() => goto("settings")}
    />
  );
  const nav = (
    <Nav
      active={NAV_OF[screen] ?? null}
      badge={null}
      onGo={(id) => goto(({ home: "home", collection: "zukan", album: "album", profile: "about", more: "place" } as const)[id])}
    />
  );

  return (
    <div className={`app ${settings.bigText ? "big-text" : ""} ${settings.animation ? "anim" : "no-anim"} mx-auto flex min-h-dvh max-w-[520px] flex-col`}>
      {screen === "title" ? (
        <Title onAction={onTitle} found={save.found.length} total={TOTAL} />
      ) : (
        <>
          <div className="sticky top-0 z-30 pt-[env(safe-area-inset-top)] bg-[#fdf3dc]">{header}</div>

          {screen === "home" ? (
            <main className="flex flex-1 flex-col">
              <HomeScreen
                {...sceneProps}
                bubble={bubble}
                foods={tableFoods}
                eating={eating}
                voiceOn={settings.voice}
                bubbleOn={settings.bubble}
                hatList={hatList}
                lockedList={HATS.filter((h) => !found.has(h.id) && h.id !== giftHat).slice(0, 24).map((h) => h.id)}
                onLocked={() => react("まだ みつけてないよ。ぼうしばこや おまかせで みつかるかも！", "surprise", "wiggle")}
                giftReady={!!giftHat}
                omakaseDone={omakaseDone}
                onTapSensei={tapSensei}
                onTapFood={(i) => eat(i, tableFoods)}
                onToggleVoice={() => {
                  const v = !settings.voice;
                  updateSettings({ voice: v, sfx: v });
                  if (v) speak("こえ、オン！");
                }}
                onToggleBubble={() => updateSettings({ bubble: !settings.bubble })}
                onHitokoto={() => react(dailyMessage(todayKey()), "smile", "hop")}
                onPhoto={takePhoto}
                onAction={(a: HomeAction) => goto(a)}
                onWearHat={(id) => wear({ hat: id }, `${HAT_BY_ID[id].name}！ ${HAT_BY_ID[id].voice}`)}
                onGift={() => giftHat && update((s) => discover({ ...s, look: { ...s.look, hat: giftHat } }, giftHat, "ぼうしばこから でてきた！"))}
                onOmakase={omakase}
              />
              {flash > 0 && <div key={flash} className="flash" />}
            </main>
          ) : (
            <main className="flex-1 px-3 pb-6 pt-2">
              <PageTitle icon={TITLES[screen].icon} label={TITLES[screen].label} onBack={() => goto("home")} />
              {screen === "kisekae" && (
                <Kisekae
                  sceneProps={sceneProps}
                  bubble={settings.bubble ? bubble : null}
                  save={save}
                  found={found}
                  voiceMode={settings.voiceMode}
                  giftHat={giftHat}
                  onTapSensei={tapSensei}
                  onWear={wear}
                  onDiscover={(id) => update((s) => discover({ ...s, look: { ...s.look, hat: id } }, id, "ぼうしばこから でてきた！"))}
                  onLocked={() => react("まだ みつけてないよ。どこにあるかな？", "surprise", "wiggle")}
                  onOmakase={omakase}
                />
              )}
              {screen === "gohan" && <Gohan sceneProps={sceneProps} bubble={settings.bubble ? bubble : null} foods={tableFoods} eating={eating} onEat={(i) => eat(i, tableFoods)} onServe={serve} onTapSensei={tapSensei} />}
              {screen === "zukan" && <Zukan found={found} favorites={save.favorites} onOpen={(id) => setPopups((p) => [{ kind: "hatInfo", id }, ...p])} onLocked={() => settings.voice && speak("まだ ひみつ！")} />}
              {screen === "cards" && (
                <Cards
                  count={save.found.length}
                  seen={save.seenCards}
                  season={viewSeason}
                  onOpen={(id) => {
                    setPopups((p) => [{ kind: "cardInfo", id }, ...p]);
                    update((s) => (s.seenCards.includes(id) ? s : { ...s, seenCards: [...s.seenCards, id] }));
                    if (settings.voice) speak(CARDS.find((c) => c.id === id)!.title);
                    if (settings.sfx) playSfx("card");
                  }}
                />
              )}
              {screen === "album" && (
                <Album
                  album={save.album ?? []}
                  found={found}
                  onSnap={(i) => setPopups((p) => [{ kind: "snap", index: i }, ...p])}
                  onPhoto={(id) => setPopups((p) => [{ kind: "photo", id }, ...p])}
                  onGoHome={() => goto("home")}
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
                    goto("home");
                    later(() => react(SEASONS[s].greeting, "smile", "hop"), 60);
                  }}
                  onGohan={() => goto("gohan")}
                />
              )}
              {screen === "about" && <About onSay={(t) => settings.voice && speak(t)} found={found} onPhoto={(id) => setPopups((p) => [{ kind: "photo", id }, ...p])} />}
              {screen === "place" && <Place onSay={(t) => settings.voice && speak(t)} />}
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
          )}

          <div className="sticky bottom-0 z-30 pb-[env(safe-area-inset-bottom)] bg-[#fdf3dc]">{nav}</div>
          {newCardCount > 0 && screen === "home" && (
            <div className="newcard-wrap">
              <button type="button" onClick={() => goto("cards")} className="newcard-toast pop-in">
                <Emo e="🃏" size="1.4em" /> あたらしい カードが {newCardCount}まい！
              </button>
            </div>
          )}
        </>
      )}

      {current && (
        <PopupView
          popup={current}
          look={save.look}
          album={save.album ?? []}
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
          onDeleteSnap={(i) => {
            update((s) => ({ ...s, album: (s.album ?? []).filter((_, j) => j !== i) }));
            closePopup();
          }}
          onUseSnap={(sn) => {
            closePopup();
            setViewSeason(sn.season as Season);
            setTableFoods(ALL_FOODS.filter((x) => x.season === sn.season));
            setScreen("home");
            wear({ hat: sn.hat, outfit: sn.outfit, item: sn.item }, "この先生に もどったよ！");
          }}
        />
      )}
    </div>
  );
}

type SceneProps = { look: Look; season: Season; face: Face; motion: string; motionKey: number };

function PageTitle({ icon, label, onBack }: { icon: string; label: string; onBack: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <button type="button" onClick={onBack} className="backbtn" aria-label="ホームへ もどる">
        <span aria-hidden>‹</span>
      </button>
      <h1 className="pagetitle">
        <Emo e={icon} size="1.25em" /> {label}
      </h1>
    </div>
  );
}

/* =========================================================
 * 着せ替え
 * ========================================================= */

const KISEKAE_VIEW: View = { y0: 220, y1: 760 };

function Kisekae(props: {
  sceneProps: SceneProps;
  bubble: string | null;
  save: SaveData;
  found: Set<string>;
  voiceMode: boolean;
  giftHat: string | null;
  onTapSensei: () => void;
  onWear: (p: Partial<Look>, line: string) => void;
  onDiscover: (id: string) => void;
  onLocked: () => void;
  onOmakase: () => void;
}) {
  const { save, found } = props;
  const [tab, setTab] = useState<"hat" | "outfit" | "item">("hat");
  const [cat, setCat] = useState<HatCategory | "fav">(HAT_BY_ID[save.look.hat]?.category ?? "food");
  const list = cat === "fav" ? HATS.filter((h) => save.favorites.includes(h.id)) : HATS.filter((h) => h.category === cat);
  const voiceLine = (name: string, v: string) => (props.voiceMode ? `これは ${name} だよ！ これにする？` : `${pick(REACTIONS)} ${v}`);
  const season = props.sceneProps.season;

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-[calc(100vw*112/941)] z-20 -mx-3 bg-[#fdf3dc]/95 px-3 pb-2 pt-1 backdrop-blur-sm min-[520px]:top-[62px]">
        <div className="cq frame2">
          <Scene {...props.sceneProps} view={KISEKAE_VIEW} onTapSensei={props.onTapSensei}>
            {props.bubble && (
              <div key={props.bubble + props.sceneProps.motionKey} className="cloud cloud-sm pop-in" style={{ ...at(KISEKAE_VIEW, 640, 560, 290, 190), fontSize: px(30) }}>
                <span>{props.bubble}</span>
              </div>
            )}
          </Scene>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(
            [
              ["hat", "👒", "ぼうし", "orange"],
              ["outfit", "👔", "ふく", "blue"],
              ["item", "🎈", "こもの", "green"],
            ] as const
          ).map(([id, icon, label, color]) => (
            <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={`gbtn gbtn-${color} gbtn-sm ${tab === id ? "is-on" : "is-dim"}`}>
              <Emo e={icon} size="1.6em" />
              <span>{label}</span>
            </button>
          ))}
          <button type="button" onClick={props.onOmakase} className="gbtn gbtn-pink gbtn-sm">
            <Emo e="⭐" size="1.6em" />
            <span>おまかせ</span>
          </button>
        </div>
      </div>

      {tab === "hat" && (
        <>
          <div className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 py-1">
            {[...HAT_CATEGORIES, { id: "fav" as const, label: "おきにいり", icon: "💛" }].map((c) => (
              <button key={c.id} type="button" onClick={() => setCat(c.id)} aria-pressed={cat === c.id} className={`chip2 ${cat === c.id ? "on" : ""}`}>
                <Emo e={c.icon} size="1.4em" />
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {props.giftHat && cat !== "fav" && (
              <button type="button" onClick={() => props.onDiscover(props.giftHat!)} className="hatcard2 gift">
                <span className="thumb flex items-center justify-center">
                  <Emo e="🎁" size="62%" className="gift-bounce" />
                </span>
                <span className="lbl">ぼうしばこ</span>
              </button>
            )}
            {list.map((h) =>
              found.has(h.id) ? (
                <button key={h.id} type="button" onClick={() => props.onWear({ hat: h.id }, voiceLine(h.name, h.voice))} className={`hatcard2 ${save.look.hat === h.id ? "sel" : ""}`} aria-pressed={save.look.hat === h.id}>
                  <span className="thumb">
                    <HatFace hat={h.id} className="h-full w-full" />
                  </span>
                  <span className="lbl">{h.name}</span>
                  {save.look.hat === h.id && <span className="check">✓</span>}
                </button>
              ) : (
                <button key={h.id} type="button" onClick={props.onLocked} className="hatcard2 locked" aria-label="まだ みつけていない ぼうし">
                  <span className="thumb flex items-center justify-center">
                    <img src={hatSrc(h.id)} alt="" className="silhouette w-[92%]" loading="lazy" draggable={false} />
                  </span>
                  <span className="lbl">？？？</span>
                </button>
              ),
            )}
            {list.length === 0 && <p className="col-span-3 py-6 text-center font-bold text-[var(--ink-soft)]">ずかんで 💛 をつけると、ここに ならぶよ</p>}
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
              className={`hatcard2 cq ${save.look.outfit === o.id ? "sel" : ""}`}
            >
              <span className="block w-full overflow-hidden rounded-[14px]">
                <Scene look={{ hat: save.look.hat, outfit: o.id, item: "item_none" }} season={season} view={{ y0: 560, y1: 960 }} showFx={false} />
              </span>
              <span className="lbl">{o.name}</span>
              {save.look.outfit === o.id && <span className="check">✓</span>}
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
              className={`hatcard2 ${save.look.item === it.id ? "sel" : ""}`}
            >
              <span className="thumb flex items-center justify-center">
                <Emo e={it.emoji} size="64%" />
              </span>
              <span className="lbl">{it.name}</span>
              {save.look.item === it.id && <span className="check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * ごはんタイム
 * ========================================================= */

function Gohan({ sceneProps, bubble, foods, eating, onEat, onServe, onTapSensei }: { sceneProps: SceneProps; bubble: string | null; foods: Food[]; eating: { slot: number; key: number } | null; onEat: (i: number) => void; onServe: (f: Food) => void; onTapSensei: () => void }) {
  const V: View = { y0: 380, y1: 1082 };
  return (
    <div className="flex flex-col gap-3">
      <div className="cq frame2">
        <Scene {...sceneProps} view={V} foods={foods} eating={eating} onTapFood={onEat} onTapSensei={onTapSensei}>
          {bubble && (
            <div key={bubble + sceneProps.motionKey} className="cloud cloud-sm pop-in" style={{ ...at(V, 636, 400, 290, 200), fontSize: px(30) }}>
              <span>{bubble}</span>
            </div>
          )}
        </Scene>
      </div>
      <section className="panel2 p-3">
        <h2 className="h2">
          <Emo e="🍽️" /> メニュー <span className="text-[0.8em] font-bold text-[var(--ink-soft)]">（えらぶと 先生が たべるよ）</span>
        </h2>
        {SEASON_ORDER.map((s) => (
          <div key={s} className="mb-2">
            <div className="text-[0.85em] font-black text-[var(--ink-soft)]">
              <Emo e={SEASONS[s].icon} /> {SEASONS[s].label}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FOODS.filter((f) => f.season === s).map((f) => (
                <button key={f.art + s} type="button" onClick={() => onServe(f)} className="foodcard" aria-label={`${f.name}を たべてもらう`}>
                  <span className="flex aspect-[6/5] w-full items-center justify-center">
                    <img src={foodSrc(f.art)} alt="" className="max-h-full max-w-[92%]" draggable={false} />
                  </span>
                  <span className="lbl">{f.name}</span>
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
 * ぼうしコレクション
 * ========================================================= */

function Zukan({ found, favorites, onOpen, onLocked }: { found: Set<string>; favorites: string[]; onOpen: (id: string) => void; onLocked: () => void }) {
  const n = found.size;
  return (
    <div className="flex flex-col gap-3">
      <div className="panel2 p-3">
        <div className="flex items-end justify-between">
          <span className="text-[1.9em] font-black leading-none">
            {n} <span className="text-[0.5em]">/ {TOTAL} こ</span>
          </span>
          <span className="text-[0.85em] font-bold text-[var(--ink-soft)]">{n < TOTAL ? `あと ${TOTAL - n}こ。ゆっくり あつめよう` : "ぜんぶ みつけた！"}</span>
        </div>
        <div className="progress2 mt-2">
          <div style={{ width: `${(n / TOTAL) * 100}%` }} />
        </div>
      </div>

      {HAT_CATEGORIES.map((c) => {
        const hats = HATS.filter((h) => h.category === c.id);
        const got = hats.filter((h) => found.has(h.id)).length;
        return (
          <section key={c.id} className="panel2 p-3">
            <h2 className="h2 flex items-center justify-between">
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
                  <button key={h.id} type="button" onClick={() => onOpen(h.id)} className="zukan2 relative" aria-label={h.name}>
                    <img src={hatSrc(h.id)} alt="" className="w-full" loading="lazy" draggable={false} />
                    {favorites.includes(h.id) && <Emo e="💛" size="1.1em" className="absolute right-1 top-1" />}
                  </button>
                ) : (
                  <button key={h.id} type="button" onClick={onLocked} className="zukan2 locked" aria-label="まだ みつけていない">
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
 * カード図鑑
 * ========================================================= */

function CardArt({ id, season }: { id: string; season: Season }) {
  return (
    <span className="cq block w-full overflow-hidden rounded-[14px] border-2 border-white/80">
      <Scene look={CARD_ART[id]} season={season} view={CARD_VIEW} showFx={false} />
    </span>
  );
}

function Cards({ count, seen, season, onOpen }: { count: number; seen: string[]; season: Season; onOpen: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-bold text-[var(--ink-soft)]">ぼうしを みつけると、先生のことが すこしずつ わかるよ。</p>
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((c) => {
          const at2 = Math.min(c.unlockAt, TOTAL);
          const open = count >= at2;
          return open ? (
            <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="gamecard2 relative" style={{ background: c.color }}>
              {!seen.includes(c.id) && <span className="badge-new2 absolute right-2 top-2 z-10">NEW</span>}
              <span className="text-[0.7em] font-black opacity-70">CARD {c.no}</span>
              <CardArt id={c.id} season={season} />
              <span className="font-black leading-tight">{c.title}</span>
            </button>
          ) : (
            <div key={c.id} className="gamecard2 locked">
              <span className="text-[0.7em] font-black opacity-60">CARD {c.no}</span>
              <div className="flex aspect-[941/570] w-full items-center justify-center rounded-[14px] bg-white/60">
                <Emo e="❓" size="3em" className="opacity-40" />
              </div>
              <span className="text-[0.8em] font-bold text-[var(--ink-soft)]">
                あと <b>{at2 - count}</b>こ ぼうしを みつけると…
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
 * アルバム
 * ========================================================= */

function Album({ album, found, onSnap, onPhoto, onGoHome }: { album: Snap[]; found: Set<string>; onSnap: (i: number) => void; onPhoto: (id: string) => void; onGoHome: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <section className="panel2 p-3">
        <h2 className="h2">
          <Emo e="📸" /> とった しゃしん
        </h2>
        {album.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center font-bold text-[var(--ink-soft)]">
            <p>ホームの「しゃしん」ボタンで、いまの先生を とれるよ。</p>
            <button type="button" onClick={onGoHome} className="gbtn gbtn-orange px-5">
              <Emo e="🏠" /> ホームへ
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {album.map((s, i) => (
              <button key={i} type="button" onClick={() => onSnap(i)} className="polaroid2" style={{ rotate: `${((i % 3) - 1) * 1.5}deg` }}>
                <span className="cq block w-full overflow-hidden">
                  <Scene look={s} season={s.season as Season} view={{ y0: 200, y1: 1082 }} showFx={false} />
                </span>
                <span className="text-[0.8em] font-bold">{s.date.replace(/^(\d+)-(\d+)-(\d+)$/, "$2月$3日")}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="panel2 p-3">
        <h2 className="h2">
          <Emo e="🌟" /> ほんものの 先生
        </h2>
        <p className="text-[0.85em] font-bold text-[var(--ink-soft)]">おなじ ぼうしを みつけると、ほんものの 写真が ひらくよ。</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {PHOTOS.map((p) =>
            found.has(p.hat) ? (
              <button key={p.id} type="button" onClick={() => onPhoto(p.id)} className="polaroid2">
                <img src={p.src} alt={p.title} className="aspect-[3/4] w-full object-cover" />
                <span className="text-[0.85em] font-bold">{p.title}</span>
              </button>
            ) : (
              <div key={p.id} className="polaroid2 opacity-80">
                <div className="flex aspect-[3/4] w-full items-center justify-center bg-[#eadfcf]">
                  <img src={hatSrc(p.hat)} alt="" className="silhouette w-[80%]" />
                </div>
                <span className="text-[0.8em] font-bold text-[var(--ink-soft)]">この ぼうしを みつけてね</span>
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

function Kisetsu({ realSeason, found, onSay, onUse, onGohan }: { realSeason: Season; found: Set<string>; onSay: (t: string) => void; onUse: (s: Season) => void; onGohan: () => void }) {
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
            className={`seasoncard ${sel === id ? "sel" : ""}`}
          >
            <img src={roomSrc(id)} alt="" className="aspect-square w-full rounded-[12px] object-cover object-[80%_10%]" draggable={false} />
            <span className="font-black">
              {SEASONS[id].label}
              {id === realSeason && <span className="ml-1 rounded-full bg-[#e2546a] px-1.5 text-[0.65em] text-white">いま</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="panel2 overflow-hidden p-3">
        <h2 className="h2 text-[1.3em]">
          <Emo e={s.icon} size="1.2em" /> {s.label}のへや
        </h2>
        <p className="font-bold">{s.greeting}</p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {s.things.map((t, i) => (
            <button key={i} type="button" onClick={() => onSay(t.name)} className="flex flex-col items-center rounded-2xl bg-white/80 p-1 shadow-sm">
              <Emo e={t.emoji} size="2.3em" />
              <span className="text-[0.62em] font-bold leading-tight">{t.name}</span>
            </button>
          ))}
        </div>
        <h3 className="h2 mt-3">
          <Emo e="🍽️" /> {s.label}の テーブル
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {s.table.map((t) => (
            <button key={t.name} type="button" onClick={() => onSay(t.name)} className="foodcard">
              <span className="flex aspect-[6/5] w-full items-center justify-center">
                <img src={foodSrc(t.art)} alt="" className="max-h-full max-w-[92%]" />
              </span>
              <span className="lbl">{t.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onUse(sel)} className="gbtn gbtn-purple">
            <Emo e="🏠" size="1.3em" /> {s.label}のへやへ
          </button>
          <button type="button" onClick={onGohan} className="gbtn gbtn-orange">
            <Emo e="🍙" size="1.3em" /> ごはんタイム
          </button>
        </div>
      </div>

      <section className="panel2 p-3">
        <h2 className="h2">
          <Emo e="👒" /> {s.label}の ぼうし
        </h2>
        <div className="grid grid-cols-4 gap-1.5">
          {hats.map((h) => (
            <div key={h.id} className={`zukan2 ${found.has(h.id) ? "" : "locked"}`}>
              <img src={hatSrc(h.id)} alt="" className={`w-full ${found.has(h.id) ? "" : "silhouette"}`} loading="lazy" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* =========================================================
 * 先生のこと
 * ========================================================= */

function About({ onSay, found, onPhoto }: { onSay: (t: string) => void; found: Set<string>; onPhoto: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="panel2 flex items-center gap-3 p-3">
        <img src="/art/portrait2.webp" alt="ひまわりの帽子の高橋先生" className="w-[46%] shrink-0 rounded-[18px] border-[3px] border-white shadow-md" />
        <div>
          <h2 className="text-[1.25em] font-black leading-tight">高橋先生って、どんなひと？</h2>
          <button type="button" onClick={() => onSay("たかはし せんせいは、こどもの おいしゃさん。うりずん という ばしょを つくったよ。")} className="gbtn gbtn-orange gbtn-sm mt-2 px-3">
            <Emo e="🔊" /> きいてみる
          </button>
        </div>
      </div>

      <section className="panel2 p-4 leading-relaxed">
        <p className="text-[1.05em] font-bold">
          <Emo e="🩺" /> <b className="font-black">子どもの おいしゃさん</b>。びょういんだけでなく、おうちにも みに いきます。
        </p>
        <p className="mt-2 text-[1.05em] font-bold">
          <Emo e="🌱" /> おもい しょうがいの ある 子どもと かぞくが、たのしく あんしんして すごせる ばしょ <b className="font-black">「うりずん」</b>を つくりました。
        </p>
        <p className="mt-2 text-[1.05em] font-bold">
          <Emo e="👒" /> イベントでは、てんとうむしや にこにこの ぼうしを かぶって とうじょう することも！
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {PHOTOS.map((p) =>
          found.has(p.hat) ? (
            <button key={p.id} type="button" onClick={() => onPhoto(p.id)} className="polaroid2">
              <img src={p.src} alt={p.title} className="aspect-[3/4] w-full object-cover" />
              <span className="text-[0.85em] font-bold">{p.title}</span>
            </button>
          ) : (
            <div key={p.id} className="polaroid2 opacity-80">
              <div className="flex aspect-[3/4] w-full items-center justify-center bg-[#eadfcf]">
                <img src={hatSrc(p.hat)} alt="" className="silhouette w-[80%]" />
              </div>
              <span className="text-[0.8em] font-bold text-[var(--ink-soft)]">ぼうしを みつけると ひらくよ</span>
            </div>
          ),
        )}
      </section>

      <AdultBox />
    </div>
  );
}

function AdultBox() {
  return (
    <section className="panel2 bg-[#eef7ff] p-4">
      <h2 className="h2">
        <Emo e="👨‍👩‍👧" /> おとなの かたへ
      </h2>
      <p className="text-[0.92em] leading-relaxed">
        宇都宮市で小児科・在宅医療に携わり、認定NPO法人うりずんの理事長を務める髙橋昭彦先生。うりずんでは、重い障がいのある子どもと家族のために、日中活動・児童発達支援・放課後等デイサービス・訪問支援・相談支援などを行っています。
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {OFFICIAL_LINKS.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="linkrow">
              {l.label}
              <span className="text-[0.8em] text-[var(--ink-soft)]">公式サイト ↗</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.75em] text-[var(--ink-soft)]">※ 外部サイトがひらきます。おとなの人と いっしょに みてね。</p>
    </section>
  );
}

/* =========================================================
 * うりずんの場所
 * ========================================================= */

function Place({ onSay }: { onSay: (t: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="panel2 overflow-hidden p-0">
        <div className="relative">
          <img src="/art/place-urizun.webp" alt="うりずんの たてもの（イラスト）" className="w-full" />
          <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-3 py-1 text-[0.9em] font-black shadow">
            <Emo e="📍" /> とちぎけん うつのみやし
          </span>
        </div>
        <div className="p-4">
          <h2 className="text-[1.25em] font-black">うりずんって どんなところ？</h2>
          <p className="mt-1 font-bold leading-relaxed">
            おもい しょうがいの ある 子どもたちが、あそんだり、すごしたり、おとまりしたりできる ばしょ。かぞくも ほっと ひとやすみ できるよ。
          </p>
          <button type="button" onClick={() => onSay("うりずんは、とちぎけん うつのみやしに あるよ。こどもたちが あそんだり、すごしたり できる ばしょ だよ。")} className="gbtn gbtn-pink gbtn-sm mt-2 px-3">
            <Emo e="🔊" /> きいてみる
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["☀️", "ひるま すごす"],
          ["🎒", "がっこうの あと"],
          ["🏠", "おうちへ いく"],
        ].map(([e, t]) => (
          <div key={t} className="panel2 flex flex-col items-center p-2 text-center">
            <Emo e={e} size="2.4em" />
            <span className="text-[0.8em] font-black">{t}</span>
          </div>
        ))}
      </div>
      <a href="https://www.google.com/maps/search/?api=1&query=%E8%AA%8D%E5%AE%9ANPO%E6%B3%95%E4%BA%BA%E3%81%86%E3%82%8A%E3%81%9A%E3%82%93" target="_blank" rel="noopener noreferrer" className="gbtn gbtn-pink">
        <Emo e="🗺️" size="1.3em" /> ちずで みる（おとなの人と）
      </a>
      <AdultBox />
    </div>
  );
}

/* =========================================================
 * 設定
 * ========================================================= */

function SettingsScreen({ settings, onChange, onReset }: { settings: Settings; onChange: (p: Partial<Settings>) => void; onReset: () => void }) {
  const rows: { key: keyof Settings; icon: string; label: string; note?: string }[] = [
    { key: "voice", icon: "🗣️", label: "先生の こえ" },
    { key: "bubble", icon: "💬", label: "ふきだし" },
    { key: "voiceMode", icon: "👂", label: "おんせいで あそぶ", note: "なまえを こえで おしえてくれます" },
    { key: "sfx", icon: "🔔", label: "こうかおん" },
    { key: "bgm", icon: "🎵", label: "BGM（オルゴール）" },
    { key: "vibration", icon: "📳", label: "しんどう" },
    { key: "animation", icon: "🌀", label: "うごき（アニメーション）" },
    { key: "bigText", icon: "🔠", label: "もじを おおきく" },
  ];
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const on = settings[r.key];
        return (
          <button key={r.key} type="button" role="switch" aria-checked={on} onClick={() => onChange({ [r.key]: !on })} className={`setrow ${on ? "on" : ""}`}>
            <Emo e={r.icon} size="1.9em" />
            <span className="flex-1 text-left">
              <span className="block font-black">{r.label}</span>
              {r.note && <span className="block text-[0.75em] font-bold text-[var(--ink-soft)]">{r.note}</span>}
            </span>
            <span className={`toggle2 ${on ? "on" : ""}`}>
              <span />
            </span>
          </button>
        );
      })}
      <p className="mt-2 text-[0.8em] font-bold leading-relaxed text-[var(--ink-soft)]">
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
  album: Snap[];
  season: Season;
  isFav: boolean;
  onClose: () => void;
  onSay: (t: string) => void;
  onWear: (id: string) => void;
  onFav: (id: string) => void;
  onOpenCards: () => void;
  onDeleteSnap: (i: number) => void;
  onUseSnap: (s: Snap) => void;
}) {
  const { popup } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3a2a1f]/50 p-4" role="dialog" aria-modal="true" onClick={props.onClose}>
      <div className="pop-in panel2 max-h-[92dvh] w-full max-w-[400px] overflow-y-auto p-4 text-center" onClick={(e) => e.stopPropagation()}>
        {(popup.kind === "hat" || popup.kind === "hatInfo") && <HatPopup {...props} id={popup.id} reason={popup.kind === "hat" ? popup.reason : null} />}
        {(popup.kind === "card" || popup.kind === "cardInfo") && <CardPopup {...props} id={popup.id} isNew={popup.kind === "card"} />}
        {popup.kind === "photo" && <PhotoPopup id={popup.id} onClose={props.onClose} onSay={props.onSay} />}
        {popup.kind === "snap" && props.album[popup.index] && (
          <>
            <div className="text-[1.3em] font-black">アルバム</div>
            <div className="polaroid2 mx-auto mt-2 w-[92%]">
              <span className="cq block w-full overflow-hidden">
                <Scene look={props.album[popup.index]} season={props.album[popup.index].season as Season} view={FULL_VIEW} showFx={false} />
              </span>
              <span className="font-bold">{props.album[popup.index].date.replace(/^(\d+)-(\d+)-(\d+)$/, "$1年$2月$3日")}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => props.onUseSnap(props.album[popup.index])} className="gbtn gbtn-orange gbtn-sm">
                この先生に する
              </button>
              <button type="button" onClick={props.onClose} className="gbtn gbtn-white gbtn-sm">
                とじる
              </button>
            </div>
            <button type="button" onClick={() => props.onDeleteSnap(popup.index)} className="mt-3 text-[0.8em] text-[var(--ink-soft)] underline">
              この しゃしんを けす
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function HatPopup({ id, reason, look, season, isFav, onClose, onSay, onWear, onFav }: { id: string; reason: string | null; look: Look; season: Season; isFav: boolean; onClose: () => void; onSay: (t: string) => void; onWear: (id: string) => void; onFav: (id: string) => void }) {
  const h = HAT_BY_ID[id];
  return (
    <>
      {reason && <div className="text-[1.5em] font-black text-[#e8742a]">あたらしい ぼうし！</div>}
      {reason && <div className="text-[0.9em] font-bold text-[var(--ink-soft)]">{reason}</div>}
      <button type="button" className="cq mt-2 block w-full overflow-hidden rounded-[18px] border-[3px] border-white shadow-md" onClick={() => onSay(h.voice)} aria-label="こえを きく">
        <Scene look={{ ...look, hat: id, item: "item_none" }} season={season} face="happy" view={{ y0: 200, y1: 760 }} />
      </button>
      <div className="mt-2 text-[1.6em] font-black leading-tight">{h.name}</div>
      <div className="text-[0.9em] font-bold">
        <span className="text-[#e9a92a]">{"★".repeat(h.rarity)}</span>
        <span className="text-[#ddd]">{"★".repeat(5 - h.rarity)}</span> {RARITY_LABEL[h.rarity]}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onWear(id)} className="gbtn gbtn-orange">
          <Emo e="👒" size="1.3em" /> かぶる
        </button>
        {reason ? (
          <button type="button" onClick={onClose} className="gbtn gbtn-green">
            やったね！
          </button>
        ) : (
          <button type="button" onClick={() => onFav(id)} className="gbtn gbtn-white" aria-pressed={isFav}>
            <Emo e={isFav ? "💛" : "🤍"} size="1.2em" /> おきにいり
          </button>
        )}
      </div>
      {!reason && (
        <button type="button" onClick={onClose} className="mt-2 w-full py-2 font-bold text-[var(--ink-soft)]">
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
      {isNew && <div className="text-[1.4em] font-black text-[#e2546a]">カードが ふえたよ！</div>}
      <div className="gamecard2 mx-auto mt-2 w-[90%]" style={{ background: c.color }}>
        <span className="text-[0.75em] font-black opacity-70">CARD {c.no}</span>
        <CardArt id={c.id} season={season} />
        <span className="text-[1.35em] font-black">{c.title}</span>
        {!isNew && <p className="text-left text-[1em] font-bold leading-relaxed">{c.body}</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {isNew ? (
          <>
            <button type="button" onClick={onOpenCards} className="gbtn gbtn-orange">
              みてみる
            </button>
            <button type="button" onClick={onClose} className="gbtn gbtn-white">
              あとで
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onSay(c.body)} className="gbtn gbtn-orange">
              <Emo e="🔊" /> よんで
            </button>
            <button type="button" onClick={onClose} className="gbtn gbtn-white">
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
      <div className="text-[1.3em] font-black">ほんものの 先生！</div>
      <div className="polaroid2 mx-auto mt-2 w-[86%] rotate-[-2deg]">
        <img src={p.src} alt={p.title} className="w-full" />
        <span className="font-bold">{p.title}</span>
      </div>
      <p className="mt-3 text-left font-bold leading-relaxed">{p.body}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onSay(p.body)} className="gbtn gbtn-orange">
          <Emo e="🔊" /> よんで
        </button>
        <button type="button" onClick={onClose} className="gbtn gbtn-white">
          とじる
        </button>
      </div>
    </>
  );
}

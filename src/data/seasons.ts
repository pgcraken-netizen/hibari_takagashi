export type Season = "spring" | "summer" | "autumn" | "winter";

export type SeasonInfo = {
  id: Season;
  label: string;
  icon: string;
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundDark: string;
  floaters: string[];
  table: { emoji: string; name: string; art: string }[];
  greeting: string;
  things: { emoji: string; name: string }[];
};

export const SEASONS: Record<Season, SeasonInfo> = {
  spring: {
    id: "spring",
    label: "はる",
    icon: "🌸",
    skyTop: "#bfe3f7",
    skyBottom: "#fdf3e1",
    ground: "#c6e59a",
    groundDark: "#9fcf6e",
    floaters: ["🌸", "🌸", "🦋", "🌼"],
    table: [
      { emoji: "🍡", name: "おだんご", art: "dango" },
      { emoji: "🍓", name: "いちご", art: "ichigo" },
      { emoji: "🍰", name: "いちごケーキ", art: "cake" },
    ],
    greeting: "はるだね。おはなが、さいてるよ。",
    things: [
      { emoji: "🌸", name: "さくら" },
      { emoji: "🌱", name: "しんりょく" },
      { emoji: "🍓", name: "いちご" },
      { emoji: "🍙", name: "おはなみ" },
      { emoji: "🎒", name: "にゅうがくしき" },
    ],
  },
  summer: {
    id: "summer",
    label: "なつ",
    icon: "🌻",
    skyTop: "#7cc8f2",
    skyBottom: "#e6f6ff",
    ground: "#9bd67a",
    groundDark: "#72bd52",
    floaters: ["☁️", "🌻", "🎐", "✨"],
    table: [
      { emoji: "🍉", name: "スイカ", art: "suika" },
      { emoji: "🍧", name: "かきごおり", art: "kakigori" },
      { emoji: "🍵", name: "むぎちゃ", art: "mugicha" },
    ],
    greeting: "なつだね。おみずを、のもうね。",
    things: [
      { emoji: "🌤️", name: "あおぞら" },
      { emoji: "🌻", name: "ひまわり" },
      { emoji: "🍉", name: "スイカ" },
      { emoji: "🏮", name: "なつまつり" },
      { emoji: "🎆", name: "はなび" },
    ],
  },
  autumn: {
    id: "autumn",
    label: "あき",
    icon: "🍁",
    skyTop: "#f7d9a8",
    skyBottom: "#fff4e3",
    ground: "#e5c27a",
    groundDark: "#cf9f52",
    floaters: ["🍁", "🍂", "🌰", "🍁"],
    table: [
      { emoji: "🍠", name: "やきいも", art: "yakiimo" },
      { emoji: "🌰", name: "くり", art: "kuri" },
      { emoji: "🍄", name: "きのこ", art: "kinoko" },
    ],
    greeting: "あきだね。はっぱが、あかいね。",
    things: [
      { emoji: "🍁", name: "もみじ" },
      { emoji: "🌰", name: "どんぐり" },
      { emoji: "🍠", name: "さつまいも" },
      { emoji: "🌰", name: "くり" },
      { emoji: "🎃", name: "ハロウィン" },
    ],
  },
  winter: {
    id: "winter",
    label: "ふゆ",
    icon: "⛄",
    skyTop: "#cfe0f3",
    skyBottom: "#f6f9ff",
    ground: "#f2f6fb",
    groundDark: "#d6e2ef",
    floaters: ["❄️", "❄️", "✨", "❄️"],
    table: [
      { emoji: "🍲", name: "コーンスープ", art: "soup" },
      { emoji: "🍰", name: "ケーキ", art: "cake" },
      { emoji: "☕", name: "ココア", art: "cocoa" },
    ],
    greeting: "ふゆだね。あったかくしてね。",
    things: [
      { emoji: "❄️", name: "ゆき" },
      { emoji: "🎄", name: "クリスマス" },
      { emoji: "🎍", name: "おしょうがつ" },
      { emoji: "🍲", name: "なべ" },
      { emoji: "☕", name: "あったかいのみもの" },
    ],
  },
};

export const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];

export function seasonOf(date: Date): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

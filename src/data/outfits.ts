export type Outfit = {
  id: string;
  name: string;
  icon: string;
  jacket: string | null; // 上着の色（なしなら null）
  jacketStyle: "suit" | "cardigan" | "vest" | "coat" | "none";
  shirt: string;
  tie: string | null;
  bow?: string;
  pattern?: "tweed";
  stethoscope?: boolean;
  badge?: string; // 胸元のちいさな飾り
};

export const OUTFITS: Outfit[] = [
  { id: "outfit_001", name: "スーツ・ネクタイ", icon: "👔", jacket: "#33415c", jacketStyle: "suit", shirt: "#ffffff", tie: "#d9534f" },
  { id: "outfit_002", name: "スーツ・ノーネクタイ", icon: "🧥", jacket: "#5a5e66", jacketStyle: "suit", shirt: "#e8f1fb", tie: null, pattern: "tweed" },
  { id: "outfit_003", name: "ジャケット＋シャツ", icon: "🧥", jacket: "#8a6d4f", jacketStyle: "suit", shirt: "#fdfaf2", tie: null },
  { id: "outfit_004", name: "カーディガン＋シャツ", icon: "🧶", jacket: "#e6a94b", jacketStyle: "cardigan", shirt: "#ffffff", tie: null },
  { id: "outfit_005", name: "ベスト＋シャツ", icon: "🦺", jacket: "#4f6b4a", jacketStyle: "vest", shirt: "#ffffff", tie: "#2f5d8a" },
  { id: "outfit_006", name: "フォーマルカジュアル", icon: "👕", jacket: "#2d5f8f", jacketStyle: "suit", shirt: "#2f74c0", tie: null, badge: "🕊️" },
  { id: "outfit_007", name: "こうえんかいスタイル", icon: "🎤", jacket: "#26324a", jacketStyle: "suit", shirt: "#ffffff", tie: "#2f8f5f", badge: "🎤" },
  { id: "outfit_008", name: "おいしゃさんスタイル", icon: "🩺", jacket: "#ffffff", jacketStyle: "coat", shirt: "#2f74c0", tie: null, stethoscope: true },
  { id: "outfit_009", name: "しきてんフォーマル", icon: "🎀", jacket: "#1f1f24", jacketStyle: "suit", shirt: "#ffffff", tie: null, bow: "#c23b3b", badge: "🌹" },
  { id: "outfit_010", name: "きせつのフォーマル", icon: "🍂", jacket: "#9b5a3c", jacketStyle: "suit", shirt: "#fff6e6", tie: "#e0a030" },
];

export const OUTFIT_BY_ID = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));

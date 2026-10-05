// 小物・ひとこと・ボイス・カードなど、ことばと小さなデータ

export type Item = { id: string; name: string; emoji: string; voice: string };

export const ITEMS: Item[] = [
  { id: "item_none", name: "なし", emoji: "✋", voice: "てぶらで、いこう！" },
  { id: "item_001", name: "おはな", emoji: "🌷", voice: "おはな、どうぞ！" },
  { id: "item_002", name: "ふうせん", emoji: "🎈", voice: "ふわふわ〜！" },
  { id: "item_003", name: "えほん", emoji: "📖", voice: "えほん、よもうか？" },
  { id: "item_004", name: "くまのぬいぐるみ", emoji: "🧸", voice: "くまちゃんと、いっしょ！" },
  { id: "item_005", name: "ほしのステッキ", emoji: "🪄", voice: "ちちんぷいぷい！" },
  { id: "item_006", name: "かさ", emoji: "☂️", voice: "あめでも、へっちゃら！" },
  { id: "item_007", name: "カメラ", emoji: "📷", voice: "はい、チーズ！" },
  { id: "item_008", name: "ハート", emoji: "💛", voice: "だいすきだよ！" },
  { id: "item_009", name: "うちわ", emoji: "🪭", voice: "パタパタ〜！" },
  { id: "item_010", name: "ベル", emoji: "🔔", voice: "リンリン！" },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** 今日のひとこと（30） */
export const MESSAGES: string[] = [
  "今日もゆっくりいこう。",
  "会えてうれしいよ。",
  "ちょっと休んでも大丈夫。",
  "好きなことを楽しもう。",
  "今日もいい日になるよ。",
  "無理しなくて大丈夫。",
  "また遊ぼうね。",
  "笑顔っていいね。",
  "ゆっくりでも前に進もう。",
  "今日もぼちぼち！",
  "おいしいもの、食べたかな？",
  "きみのペースで、いいんだよ。",
  "ぼうし、にあってるかな？",
  "いっしょに遊べて、たのしいな。",
  "空を見てごらん。",
  "深呼吸、すー、はー。",
  "今日はどんな日だった？",
  "がんばらなくても、大丈夫。",
  "ありがとうって、いい言葉だね。",
  "おひさま、ぽかぽか。",
  "ねむいときは、ねようね。",
  "きみに会えると、元気が出るよ。",
  "へんな帽子も、たのしいね。",
  "みんな、ちがって、みんないい。",
  "ちょっとずつで、いいんだよ。",
  "きょうも、ここにいるよ。",
  "ぎょうざ、好き？",
  "おともだちと、なかよくね。",
  "ゆっくり、ゆっくり。",
  "あしたも、あそぼうね。",
];

export const REACTIONS: string[] = [
  "おっ！",
  "いいね！",
  "にあってる？",
  "これにする？",
  "今日も元気だね！",
  "わあ！",
  "えへへ。",
  "なんか、すごい！",
];

export const TAP_SENSEI: { text: string; face: Face }[] = [
  { text: "こんにちは！", face: "smile" },
  { text: "おっ！", face: "surprise" },
  { text: "くすぐったい〜！", face: "happy" },
  { text: "ふぁ〜、ねむい…", face: "sleepy" },
  { text: "どう？かっこいい？", face: "proud" },
  { text: "ちょっと、つかれたかも。", face: "tired" },
  { text: "ありがとう！", face: "happy" },
  { text: "えへへ。", face: "smile" },
];

export type Face =
  | "normal"
  | "smile"
  | "surprise"
  | "happy"
  | "yummy"
  | "tired"
  | "sleepy"
  | "proud";

export function greetingByHour(h: number): string {
  if (h < 10) return "おはよう！";
  if (h < 17) return "こんにちは！";
  return "こんばんは！";
}

/**
 * 高橋先生カード
 * ※活動内容・肩書き・経歴の文章は、公開前に本人・うりずん側の確認が必要です。
 */
export type Card = {
  id: string;
  no: string;
  title: string;
  emoji: string;
  body: string;
  unlockAt: number; // 見つけた帽子の数
  color: string;
};

export const CARDS: Card[] = [
  { id: "card_001", no: "001", title: "帽子の先生", emoji: "🎩", body: "イベントでは、おもしろい帽子をかぶって登場することも。てんとうむしや、にこにこの帽子をかぶったこともあるよ。", unlockAt: 1, color: "#ffd86b" },
  { id: "card_002", no: "002", title: "小児科の先生", emoji: "🩺", body: "子どもたちの病気を診る、お医者さん。", unlockAt: 3, color: "#9fd7f5" },
  { id: "card_003", no: "003", title: "おうちのお医者さん", emoji: "🏠", body: "病院だけでなく、おうちに行って診る「在宅医療」にも関わっているよ。", unlockAt: 6, color: "#b9e59a" },
  { id: "card_004", no: "004", title: "うりずんを作った先生", emoji: "🌿", body: "重い障がいのある子どもと家族が、楽しく安心して過ごせる場所「うりずん」を作ったよ。", unlockAt: 10, color: "#f7b6c8" },
  { id: "card_005", no: "005", title: "うりずんってなに？", emoji: "🏡", body: "子どもたちが日中にすごしたり、学校のあとに遊んだりできる場所。おうちへのお手伝いや、相談ものっているよ。", unlockAt: 15, color: "#ffc98a" },
  { id: "card_006", no: "006", title: "地域の先生", emoji: "🤝", body: "医療だけでなく、地域の人たちと一緒に活動しているよ。", unlockAt: 20, color: "#c9b8f0" },
  { id: "card_007", no: "007", title: "ひばりクリニック", emoji: "🐦", body: "先生のクリニックの名前は「ひばりクリニック」。宇都宮にあるよ。", unlockAt: 30, color: "#a7e3d4" },
  { id: "card_008", no: "008", title: "本を書いた先生", emoji: "📕", body: "『うりずんの風に吹かれて』という本を書いたよ。大人の人と一緒に読んでみてね。", unlockAt: 40, color: "#f5c27a" },
  { id: "card_009", no: "009", title: "宇都宮の先生", emoji: "🥟", body: "先生がいるのは栃木県の宇都宮市。ぎょうざやいちごが有名なまちだね。", unlockAt: 55, color: "#ffe08a" },
  { id: "card_010", no: "010", title: "いつもの先生", emoji: "😊", body: "いつもにこにこ。子どもたちと一緒に、たのしいことを見つけるのが得意な先生。", unlockAt: 70, color: "#ffb8a0" },
  { id: "card_011", no: "011", title: "ぼうし博士", emoji: "🏅", body: "たくさんの帽子を見つけたね！先生も、びっくりしているよ。", unlockAt: 90, color: "#d9c2ff" },
  { id: "card_012", no: "012", title: "ぜんぶ見つけた！", emoji: "👑", body: "すべての帽子を見つけたよ。ほんとうに、ありがとう！また遊ぼうね。", unlockAt: 110, color: "#ffd2e6" },
];

export const OFFICIAL_LINKS = [
  { label: "認定NPO法人うりずん", url: "https://npourizn.org/" },
  { label: "ひばりクリニック", url: "https://hibari-clinic.com/" },
];

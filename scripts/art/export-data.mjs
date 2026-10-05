// ゲームのデータをアート書き出し用JSONにする（node --experimental-strip-types）
import fs from "node:fs";
const { HATS } = await import("../../src/data/hats.ts");
const { SEASONS } = await import("../../src/data/seasons.ts");
const { ITEMS, CARDS } = await import("../../src/data/content.ts");
const { OUTFITS } = await import("../../src/data/outfits.ts");
const seg = new Intl.Segmenter("ja", { granularity: "grapheme" });
const emojis = new Set();
const add = (s) => { for (const g of seg.segment(s)) if (/\p{Extended_Pictographic}/u.test(g.segment)) emojis.add(g.segment); };
for (const f of ["src/data/hats.ts", "src/data/seasons.ts", "src/data/content.ts", "src/data/outfits.ts", "src/lib/art.ts", "src/components/GameApp.tsx", "src/components/Title.tsx"]) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/["'`]([^"'`\n]*\p{Extended_Pictographic}[^"'`\n]*)["'`]/gu)) add(m[1]);
}
fs.writeFileSync("scripts/art/data.json", JSON.stringify({ hats: HATS, seasons: SEASONS, items: ITEMS, cards: CARDS, outfits: OUTFITS, emojis: [...emojis] }, null, 1));
console.log("hats", HATS.length, "emojis", emojis.size);

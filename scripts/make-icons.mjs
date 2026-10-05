// 使い方: npm i --no-save sharp && npm run icons
import sharp from "sharp";
const src = "public/icon.svg";
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  await sharp(src).resize(size, size).png().toFile(`public/${name}`);
}
console.log("icons done");

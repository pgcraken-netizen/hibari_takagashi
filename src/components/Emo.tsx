/* eslint-disable @next/next/no-img-element */
import { emojiSrc } from "@/lib/art";

/** 絵文字を「クレヨン水彩」タッチの絵で表示（端末による絵文字の違いをなくす） */
export default function Emo({ e, size = "1.2em", className = "", label }: { e: string; size?: number | string; className?: string; label?: string }) {
  return (
    <img
      src={emojiSrc(e)}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`inline-block select-none align-middle ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

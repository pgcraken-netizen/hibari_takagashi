"use client";

/* ---------- 声（ブラウザの読み上げ） ----------
 * 本人録音の音声ができたら public/voice/ に置き、ここで差し替えられるようにしてあります。
 */

let jaVoice: SpeechSynthesisVoice | null = null;

function findVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  jaVoice =
    voices.find((v) => v.lang === "ja-JP" && /otoya|male|ichiro|keita|daichi/i.test(v.name)) ??
    voices.find((v) => v.lang === "ja-JP") ??
    voices.find((v) => v.lang.startsWith("ja")) ??
    null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  findVoice();
  window.speechSynthesis.onvoiceschanged = findVoice;
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[！!？?〜]/g, (m) => (m === "〜" ? "ー" : m)));
    u.lang = "ja-JP";
    if (jaVoice) u.voice = jaVoice;
    u.rate = 0.88; // ゆっくり
    u.pitch = 1.05;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* 読み上げできない端末でも止まらない */
  }
}

/* ---------- 効果音（ファイル不要の小さな音） ---------- */

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.15, target?: AudioNode) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(target ?? c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export type Sfx = "pop" | "select" | "new" | "omakase" | "eat" | "card";

export function playSfx(kind: Sfx) {
  switch (kind) {
    case "pop":
      tone(660, 0, 0.12, "sine", 0.12);
      break;
    case "select":
      tone(523, 0, 0.1, "triangle", 0.12);
      tone(784, 0.07, 0.15, "triangle", 0.1);
      break;
    case "new":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, "triangle", 0.12));
      break;
    case "omakase":
      [392, 494, 587, 698, 784].forEach((f, i) => tone(f, i * 0.06, 0.15, "sine", 0.1));
      break;
    case "eat":
      tone(330, 0, 0.08, "square", 0.05);
      tone(392, 0.12, 0.08, "square", 0.05);
      tone(330, 0.24, 0.08, "square", 0.05);
      break;
    case "card":
      tone(880, 0, 0.3, "sine", 0.1);
      tone(1175, 0.1, 0.4, "sine", 0.08);
      break;
  }
}

export function vibrate(on: boolean, ms = 15) {
  if (!on) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* noop */
  }
}

/* ---------- BGM（やさしいオルゴール） ---------- */

let bgmTimer: number | null = null;
let bgmGain: GainNode | null = null;
const MELODY = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 784, 659, 587, 523];

export function startBgm() {
  const c = ac();
  if (!c || bgmTimer !== null) return;
  bgmGain = c.createGain();
  bgmGain.gain.value = 0.35;
  bgmGain.connect(c.destination);
  let i = 0;
  const step = () => {
    if (!bgmGain) return;
    tone(MELODY[i % MELODY.length], 0, 0.9, "sine", 0.05, bgmGain);
    if (i % 4 === 0) tone(MELODY[i % MELODY.length] / 2, 0, 1.6, "triangle", 0.03, bgmGain);
    i++;
  };
  step();
  bgmTimer = window.setInterval(step, 520);
}

export function stopBgm() {
  if (bgmTimer !== null) window.clearInterval(bgmTimer);
  bgmTimer = null;
  bgmGain?.disconnect();
  bgmGain = null;
}

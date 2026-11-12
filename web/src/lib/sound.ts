/** Tiny 8-bit sound effects. Muted by default; browsers only allow audio after a tap. */
import { getState } from "./store/app-store";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, vol = 0.05) {
  const c = audio();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.03);
}

export type Sfx = "coin" | "hit" | "level" | "blip";

export function sfx(kind: Sfx, force = false) {
  if (!force && !getState().sound) return;
  if (kind === "coin") { tone(988, 0, 0.07); tone(1319, 0.07, 0.22); }
  else if (kind === "hit") { tone(220, 0, 0.1, 0.06); tone(130, 0.09, 0.2, 0.06); }
  else if (kind === "level") [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.16));
  else tone(660, 0, 0.05, 0.035);
}

// Chiptune soundtrack + sound effects for the brag video, written as one piece.
// 120 BPM (beat 0.5s, 16th 0.125s), A minor, 20.0s. Every event is on the 1/16 grid from t=0.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100, DUR = 20, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const BEAT = 0.5, S16 = 0.125;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

const osc = {
  square: (p, duty = 0.5) => ((p % 1) < duty ? 1 : -1),
  tri: (p) => 1 - 4 * Math.abs((p % 1) - 0.5),
  sine: (p) => Math.sin(2 * Math.PI * p),
};

/** Add a tone. env: attack/decay/sustain level/release in seconds. pan -1..1 */
function tone(t0, dur, f0, { wave = "square", duty = 0.5, gain = 0.1, f1 = f0, a = 0.004, d = 0.08, s = 0.6, r = 0.05, pan = 0 } = {}) {
  const i0 = Math.round(t0 * SR), len = Math.round((dur + r) * SR);
  let ph = 0;
  for (let i = 0; i < len && i0 + i < N; i++) {
    const t = i / SR;
    const f = f0 + (f1 - f0) * Math.min(1, t / dur);
    ph += f / SR;
    let env = t < a ? t / a : t < a + d ? 1 - (1 - s) * ((t - a) / d) : t < dur ? s : s * Math.max(0, 1 - (t - dur) / r);
    const v = (wave === "square" ? osc.square(ph, duty) : osc[wave](ph)) * env * gain;
    L[i0 + i] += v * Math.min(1, 1 - pan); R[i0 + i] += v * Math.min(1, 1 + pan);
  }
}

/** Filtered noise burst: hp/lp are one-pole coefficients (0..1). */
function noise(t0, dur, { gain = 0.1, hp = 0, lp = 1, decay = dur, swell = false, pan = 0 } = {}) {
  const i0 = Math.round(t0 * SR), len = Math.round(dur * SR);
  let lpY = 0, hpY = 0, prev = 0;
  for (let i = 0; i < len && i0 + i < N; i++) {
    const t = i / SR;
    const x = rnd();
    lpY += lp * (x - lpY);
    hpY = hp ? (1 - hp) * (hpY + lpY - prev) : lpY; prev = lpY;
    const env = swell ? Math.pow(t / dur, 2) : Math.exp(-t / Math.max(0.001, decay / 4));
    const v = hpY * env * gain;
    L[i0 + i] += v * Math.min(1, 1 - pan); R[i0 + i] += v * Math.min(1, 1 + pan);
  }
}

const kick = (t, g = 0.55) => tone(t, 0.14, 150, { wave: "sine", f1: 42, gain: g, a: 0.001, d: 0.12, s: 0.0, r: 0.02 });
const snare = (t, g = 0.16) => { noise(t, 0.16, { gain: g, hp: 0.25, lp: 0.6, decay: 0.16 }); tone(t, 0.06, 196, { wave: "tri", gain: g * 0.6, d: 0.05, s: 0, r: 0.02 }); };
const hat = (t, g = 0.035) => noise(t, 0.04, { gain: g, hp: 0.7, lp: 1, decay: 0.04, pan: 0.35 });

// Chords per 2s bar: Am F C G Am F C G | F Am(outro)
const CH = [
  { root: 45, tones: [57, 60, 64] }, // Am
  { root: 41, tones: [53, 57, 60] }, // F
  { root: 48, tones: [60, 64, 67] }, // C
  { root: 43, tones: [55, 59, 62] }, // G
];
const chordAt = (bar) => (bar === 8 ? CH[1] : bar === 9 ? CH[0] : CH[bar % 4]);

for (let bar = 0; bar < 10; bar++) {
  const t0 = bar * 2, ch = chordAt(bar);
  // Bass
  if (bar === 0) {
    tone(0, 1.9, hz(ch.root), { wave: "tri", gain: 0.2, d: 0.4, s: 0.5, r: 0.1 });
  } else if (bar < 9) {
    const pat = [0, 0, 12, 0, 0, 7, 12, 7];
    pat.forEach((iv, k) => tone(t0 + k * 0.25, 0.2, hz(ch.root + iv), { wave: "tri", gain: 0.2, d: 0.1, s: 0.55, r: 0.03 }));
  } else {
    tone(t0, 1.9, hz(ch.root), { wave: "tri", gain: 0.2, d: 0.6, s: 0.5, r: 0.3 });
  }
  // Arpeggio (from the reveal at 2.5s until the outro)
  for (let k = 0; k < 16; k++) {
    const t = t0 + k * S16;
    if (t < 2.5 || t >= 17.5) continue;
    const order = [0, 1, 2, 1];
    const m = ch.tones[order[k % 4]] + 12 + (k >= 8 && k % 4 === 2 ? 12 : 0);
    tone(t, 0.09, hz(m), { wave: "square", duty: 0.25, gain: 0.035, d: 0.06, s: 0.25, r: 0.03, pan: k % 2 ? 0.25 : -0.25 });
  }
  // Soft pad under everything after the reveal
  if (t0 + 2 > 2.5 && bar < 9) {
    const start = Math.max(t0, 2.5);
    ch.tones.forEach((m, j) => tone(start, t0 + 2 - start - 0.05, hz(m), { wave: "tri", gain: 0.022, a: 0.08, d: 0.2, s: 0.8, r: 0.08, pan: (j - 1) * 0.3 }));
  }
}

// Drums: hook is sparse, full groove from 2.5 to 17.5
kick(0); kick(1.0, 0.6);
for (let t = 2.5; t < 17.5 - 1e-9; t += BEAT) {
  kick(t);
  const beatInBar = Math.round(((t % 2) / BEAT)) % 4;
  if (beatInBar === 1 || beatInBar === 3) snare(t);
  hat(t + 0.25);
}
// Riser into the reveal
noise(1.5, 1.0, { gain: 0.09, hp: 0.4, lp: 0.5, swell: true });

// ---- Sound effects (in A minor, under the music) ----
// Hook hit at 1.0: a low A dropping an octave
tone(1.0, 0.28, hz(57), { wave: "square", duty: 0.5, f1: hz(45), gain: 0.09, d: 0.2, s: 0.2, r: 0.05 });
noise(1.0, 0.18, { gain: 0.07, hp: 0.1, lp: 0.5, decay: 0.18 });
// Whooshes into each cut
for (const c of [2.5, 6.0, 10.5, 14.5, 17.5]) noise(c - 0.25, 0.25, { gain: 0.045, hp: 0.3, lp: 0.35, swell: true });
// Typing ticks on the 1/16 grid
for (let t = 6.5; t < 7.9; t += S16) noise(t, 0.012, { gain: 0.03, hp: 0.6, lp: 1, decay: 0.012, pan: 0.2 });
for (let t = 10.625; t < 11.0; t += S16) noise(t, 0.012, { gain: 0.03, hp: 0.6, lp: 1, decay: 0.012, pan: 0.2 });
// Coin when the coffee saves (B5 → E6)
const coin = (t, g = 0.05) => { tone(t, 0.06, hz(83), { duty: 0.5, gain: g, d: 0.04, s: 0.6, r: 0.01 }); tone(t + 0.0625, 0.2, hz(88), { duty: 0.5, gain: g, d: 0.15, s: 0.3, r: 0.08 }); };
coin(9.5);
// Overspend hit at 12.0
tone(12.0, 0.24, hz(52), { wave: "square", f1: hz(40), gain: 0.08, d: 0.18, s: 0.2, r: 0.05 });
noise(12.0, 0.15, { gain: 0.06, hp: 0.1, lp: 0.5, decay: 0.15 });
// Tap on Groceries, then the save
tone(13.5, 0.05, hz(81), { duty: 0.25, gain: 0.04, d: 0.04, s: 0.2, r: 0.02 });
coin(13.75, 0.045);
// Stars: A minor pentatonic run
[81, 84, 86, 88, 91, 93, 96].forEach((m, i) => tone(15.0 + i * S16, 0.1, hz(m), { duty: 0.25, gain: 0.04, d: 0.08, s: 0.3, r: 0.04, pan: -0.3 + i * 0.1 }));
// Loot: quick A minor arpeggio up
[69, 72, 76, 81].forEach((m, i) => tone(16.5 + i * 0.0625, 0.18, hz(m), { duty: 0.5, gain: 0.045, d: 0.12, s: 0.35, r: 0.08 }));
// Outro: soft crash and a held A minor chord
noise(17.5, 1.4, { gain: 0.05, hp: 0.5, lp: 0.8, decay: 1.4 });
kick(17.5, 0.5);
[57, 64, 69, 72].forEach((m, j) => tone(17.5, 2.0, hz(m), { wave: j < 2 ? "tri" : "square", duty: 0.25, gain: j < 2 ? 0.07 : 0.025, a: 0.01, d: 0.5, s: 0.5, r: 0.4, pan: (j - 1.5) * 0.2 }));

// ---- Mix: gentle glue, fade the last 0.6s, normalize to -1 dBFS ----
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = t > DUR - 0.6 ? Math.max(0, (DUR - t) / 0.6) : 1;
  const fadeIn = Math.min(1, t / 0.01);
  L[i] = Math.tanh(L[i] * 1.3) / 1.3 * fade * fadeIn;
  R[i] = Math.tanh(R[i] * 1.3) / 1.3 * fade * fadeIn;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = (Math.pow(10, -1 / 20)) / (peak || 1);

// ---- Write 16-bit stereo WAV ----
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * norm * 32767))), i * 4);
  data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * norm * 32767))), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write("data", 36); header.writeUInt32LE(data.length, 40);
const out = join(dirname(fileURLToPath(import.meta.url)), "music.wav");
writeFileSync(out, Buffer.concat([header, data]));
console.log(`music.wav: ${DUR}s, peak before normalize ${peak.toFixed(2)}`);

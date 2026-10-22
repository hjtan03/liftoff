import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "./browserStorage";

/**
 * Small chiptune sounds, synthesized on the fly with the Web Audio API, so
 * there are no files to load. Every sound starts from a player's action, which
 * browsers require before audio can play. Volume stays low on purpose: the
 * sounds confirm what happened, they don't announce it.
 */

const SOUND_STORAGE_KEY = "liftoff.sound";
const MASTER_VOLUME = 0.09;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readStorage(SOUND_STORAGE_KEY) === "off";
const listeners = new Set<() => void>();

/** The audio graph, created on first use; null when muted or unsupported. */
function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (muted || typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;
  try {
    if (!context) {
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(context.destination);
    }
    if (context.state === "suspended") void context.resume();
    return { ctx: context, out: master! };
  } catch {
    return null;
  }
}

type ToneOptions = {
  type?: OscillatorType;
  volume?: number;
  /** Glide to this frequency over the tone's length. */
  slideTo?: number;
};

function tone(
  frequency: number,
  startIn: number,
  duration: number,
  { type = "square", volume = 1, slideTo }: ToneOptions = {},
) {
  const graph = audio();
  if (!graph) return;
  const { ctx, out } = graph;
  const start = ctx.currentTime + startIn;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo)
    oscillator.frequency.exponentialRampToValueAtTime(
      slideTo,
      start + duration,
    );
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(out);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** A burst of filtered noise: engines, whooshes, puffs of smoke. */
function noise(
  startIn: number,
  duration: number,
  { volume = 1, from = 1200, to = 300 } = {},
) {
  const graph = audio();
  if (!graph) return;
  const { ctx, out } = graph;
  const start = ctx.currentTime + startIn;
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) samples[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(to, start + duration);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(volume, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(envelope).connect(out);
  source.start(start);
}

/** C major pentatonic, two octaves: every combination sounds friendly. */
const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

export const sfx = {
  /** Choosing a confidence band: higher pitch for a tighter band. */
  select(bandIndex: number) {
    tone(NOTES[4 - bandIndex], 0, 0.06, { volume: 0.5 });
  },
  /** Firing a stage: a short hiss as the guess locks in. */
  fire() {
    noise(0, 0.25, { volume: 0.6, from: 3000, to: 400 });
    tone(220, 0, 0.12, { type: "triangle", slideTo: 440, volume: 0.6 });
  },
  /** One bubble of fuel; called as the tank fills, pitch rising with the level. */
  fuelBubble(fillFraction: number) {
    const note =
      NOTES[Math.min(NOTES.length - 1, Math.floor(fillFraction * 8))];
    tone(note, 0, 0.05, { type: "triangle", volume: 0.45 });
  },
  /** The tank settles: one note for a rough hit, up to a little fanfare for dead on. */
  stageFired(level: 1 | 2 | 3 | 4) {
    const run = [0, 2, 4, 7].slice(0, level);
    run.forEach((index, step) =>
      tone(NOTES[index + 2], step * 0.08, 0.16, { volume: 0.55 }),
    );
    if (level === 4)
      [9, 7, 9].forEach((index, step) =>
        tone(NOTES[index], 0.34 + step * 0.06, 0.1, {
          type: "triangle",
          volume: 0.4,
        }),
      );
  },
  /** A misfire: a deflating wah and a puff of smoke. */
  misfire() {
    tone(392, 0, 0.18, { type: "triangle", slideTo: 330, volume: 0.6 });
    tone(330, 0.2, 0.32, { type: "triangle", slideTo: 196, volume: 0.6 });
    noise(0.1, 0.4, { volume: 0.25, from: 800, to: 150 });
  },
  /** Moving on to the next stage. */
  next() {
    tone(NOTES[3], 0, 0.05, { volume: 0.4 });
    tone(NOTES[5], 0.05, 0.07, { volume: 0.4 });
  },
  /** Lift-off: an engine rumble under a rising sweep. */
  launch() {
    noise(0, 1.6, { volume: 0.7, from: 600, to: 120 });
    tone(110, 0, 1.4, { type: "sawtooth", slideTo: 330, volume: 0.25 });
  },
  /** The rocket passes a stop on its way out. */
  passStop(stopIndex: number) {
    tone(NOTES[Math.min(NOTES.length - 1, stopIndex + 1)], 0, 0.09, {
      volume: 0.45,
    });
  },
  /** A soft tick for calculator keys and small buttons. */
  tick() {
    tone(1568, 0, 0.025, { type: "triangle", volume: 0.25 });
  },
};

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  writeStorage(SOUND_STORAGE_KEY, next ? "off" : "on");
  if (next) void context?.suspend();
  listeners.forEach((listener) => listener());
}

/** Whether sound is muted, kept in step with the toggle wherever it's read. */
export function useMuted(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isMuted,
    () => false,
  );
}

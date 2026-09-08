/**
 * The sound of something shipping. Synthesised with the Web Audio API rather
 * than an audio file so the celebration costs no download and no dependency —
 * a four-note rise, quiet enough for a laptop in a workshop room.
 *
 * Browsers refuse to make noise in a tab nobody has interacted with, so every
 * failure here is expected and silent: the confetti still lands.
 */

const NOTES = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
const NOTE_GAP = 0.11;
const NOTE_LENGTH = 0.45;
const PEAK_GAIN = 0.12;

type AudioContextCtor = typeof AudioContext;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export function playShipChime(): void {
  try {
    const ctx = audioContext();
    if (!ctx) return;
    // A suspended context means no user gesture yet; resume() is a no-op if it
    // is refused, and the notes below simply never become audible.
    void ctx.resume?.();

    const start = ctx.currentTime + 0.02;
    NOTES.forEach((freq, i) => {
      const at = start + i * NOTE_GAP;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + NOTE_LENGTH);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + NOTE_LENGTH);
    });

    const done = start + NOTES.length * NOTE_GAP + NOTE_LENGTH;
    setTimeout(() => void ctx.close?.(), Math.ceil((done - ctx.currentTime + 0.1) * 1000));
  } catch {
    /* no celebration noise available — never worth breaking the board over */
  }
}

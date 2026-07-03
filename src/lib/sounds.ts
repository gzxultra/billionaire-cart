// Web Audio API procedural sound effects — no audio files needed

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function initAudio() {
  // Call on first user interaction to unlock AudioContext
  try {
    const ctx = getContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  } catch {
    // Audio not supported
  }
}

export function playAuthorize() {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    // Deep bass — 60Hz fundamental
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(60, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.5);

    // Harmonic — 120Hz
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(120, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.5);

    // Envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    // Compressor
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-24, now);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(comp);
    comp.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch {
    // Audio not supported
  }
}

export function playSparkle() {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    // High-frequency sine sweep 2000→4000Hz
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(4000, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Audio not supported
  }
}

export function playComboTick(comboCount: number) {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    // Base frequency rises with combo
    const baseFreq = 300 + Math.min(comboCount * 40, 800);

    // Quick percussive blip
    const osc = ctx.createOscillator();
    osc.type = comboCount >= 10 ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.12);

    const gain = ctx.createGain();
    const volume = Math.min(0.15 + comboCount * 0.01, 0.35);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Add harmonic for high combos
    if (comboCount >= 5) {
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(baseFreq * 2, now);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3, now + 0.08);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.08, now + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.15);
    }
  } catch {
    // Audio not supported
  }
}

export function playAchievement() {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    // Ascending bright tone
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch {
    // Audio not supported
  }
}

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

/** Tiered purchase sounds — different audio for different price ranges */
export function playTieredPurchase(price: number) {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    if (price < 100) {
      // Cheap: quick cash-register "cha-ching" — bright click
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (price < 10_000) {
      // Mid: satisfying double-tone register
      const notes = [523, 659]; // C5, E5
      for (let i = 0; i < notes.length; i++) {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(notes[i], now + i * 0.08);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      }
    } else if (price < 1_000_000) {
      // Expensive: vault door — deep resonant thud + shimmer
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(80, now);
      osc1.frequency.exponentialRampToValueAtTime(50, now + 0.6);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.8);
      // Shimmer
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1500, now + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(3000, now + 0.4);
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.08, now + 0.17);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } else if (price < 1_000_000_000) {
      // Ultra: orchestral swell — rising chord
      const chord = [220, 277, 330, 440]; // A3, C#4, E4, A4
      for (let i = 0; i < chord.length; i++) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(chord[i], now + i * 0.05);
        osc.frequency.exponentialRampToValueAtTime(chord[i] * 1.5, now + i * 0.05 + 0.5);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.05 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.7);
      }
    } else {
      // ABSURD (billion+): full dramatic cascade + sub bass
      const cascade = [196, 262, 330, 392, 523, 659, 784]; // G3→G5
      for (let i = 0; i < cascade.length; i++) {
        const osc = ctx.createOscillator();
        osc.type = i < 3 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(cascade[i], now + i * 0.06);
        osc.frequency.exponentialRampToValueAtTime(cascade[i] * 1.2, now + i * 0.06 + 0.4);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.1, now + i * 0.06 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.6);
      }
      // Sub bass thud
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(40, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + 0.8);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0, now);
      subGain.gain.linearRampToValueAtTime(0.4, now + 0.03);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 1);
    }
  } catch {
    // Audio not supported
  }
}

/** Gamble win — triumphant ascending notes */
export function playGambleWin() {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(notes[i], now + i * 0.1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    }
  } catch { /* noop */ }
}

/** Gamble lose — descending wah-wah */
export function playGambleLose() {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    const notes = [392, 349, 294, 196]; // G4 F4 D4 G3
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(notes[i], now + i * 0.15);
      osc.frequency.exponentialRampToValueAtTime(notes[i] * 0.7, now + i * 0.15 + 0.2);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.15 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    }
  } catch { /* noop */ }
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

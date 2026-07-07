/**
 * Haptic feedback utility — provides tactile feedback on supported devices.
 * Uses the Vibration API on mobile browsers and falls back silently.
 */

type HapticIntensity = "light" | "medium" | "heavy" | "success" | "error";

const VIBRATION_PATTERNS: Record<HapticIntensity, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 50, 30],
  error: [50, 30, 50, 30, 50],
};

export function triggerHaptic(intensity: HapticIntensity = "medium"): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(VIBRATION_PATTERNS[intensity]);
    }
  } catch {
    // Vibration API not available — silently ignore
  }
}

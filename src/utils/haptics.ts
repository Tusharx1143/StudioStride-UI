/**
 * Haptic feedback utility supporting multi-level vibration patterns
 * for touch interactions, snap alignment guides, carousel swipes, and selection actions.
 */

export type HapticType = "light" | "medium" | "heavy" | "snap" | "selection" | "success" | "error";

export function triggerHaptic(type: HapticType = "light"): void {
  if (typeof window === "undefined" || !("navigator" in window) || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case "light":
        navigator.vibrate(8);
        break;
      case "selection":
        navigator.vibrate(12);
        break;
      case "snap":
        // Crisp double tap for snap guide alignment
        navigator.vibrate([15, 30, 15]);
        break;
      case "medium":
        navigator.vibrate(25);
        break;
      case "heavy":
        navigator.vibrate(45);
        break;
      case "success":
        navigator.vibrate([15, 40, 20]);
        break;
      case "error":
        navigator.vibrate([30, 50, 30, 50, 30]);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch {
    // Ignore permissions or environment restrictions
  }
}

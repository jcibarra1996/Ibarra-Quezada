"use client";

/**
 * Feedback háptico táctil.
 *
 * Safari en iOS NO expone `navigator.vibrate` de forma confiable (Apple
 * no lo soporta en WebKit hasta versiones muy recientes, y solo tras un
 * gesto directo del usuario). Esta capa intenta la Vibration API
 * estándar (funciona en Android/Chrome y en iOS 18+ dentro de ciertos
 * contextos) y falla en silencio si no existe — sin romper la
 * interacción. Si el proyecto se empaqueta luego con Capacitor
 * (`@capacitor/haptics`), esta función es el único lugar a reemplazar.
 */
type HapticStyle = "light" | "medium" | "success";

const PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 15,
  medium: 30,
  success: [20, 40, 20],
};

export function fireHaptic(style: HapticStyle = "success") {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(PATTERNS[style]);
    }
  } catch {
    // Silencioso: no todos los navegadores permiten vibrate() aquí.
  }
}

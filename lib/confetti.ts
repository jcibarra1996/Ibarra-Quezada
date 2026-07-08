"use client";

import confetti from "canvas-confetti";
import type { Context } from "./types";

const COLORS: Record<Context, string[]> = {
  trabajo: ["#00e5ff", "#ffffff", "#0a3a42"],
  casa: ["#ff2fd0", "#ffffff", "#3a0a34"],
};

/**
 * Explosión de confeti anclada al punto exacto donde el usuario tocó
 * (micro-dopamina visual "justo debajo del dedo").
 */
export function burstConfettiAt(clientX: number, clientY: number, context: Context) {
  const origin = {
    x: clientX / window.innerWidth,
    y: clientY / window.innerHeight,
  };

  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 35,
    scalar: 0.9,
    gravity: 1.1,
    ticks: 90,
    origin,
    colors: COLORS[context],
    zIndex: 9999,
    disableForReducedMotion: true,
  });
}

export function burstConfettiBig() {
  confetti({
    particleCount: 140,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors: ["#c6ff00", "#00e5ff", "#ff2fd0", "#ffffff"],
    zIndex: 9999,
    disableForReducedMotion: true,
  });
}

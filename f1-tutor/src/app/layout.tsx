import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 Tutor — Aprende Fórmula 1",
  description:
    "Tu maestro personal de Fórmula 1. Aprende sobre equipos, reglas, circuitos y estrategia con Nico Paddock.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

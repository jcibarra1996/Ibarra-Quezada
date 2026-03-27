import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestor de Contratos",
  description: "Plataforma legal de gestión de contratos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

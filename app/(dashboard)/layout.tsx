import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-60 border-r px-4 py-6 flex flex-col gap-4">
        <span className="text-sm font-semibold tracking-tight">Gestor de Contratos</span>
        <nav className="flex flex-col gap-1 text-sm text-muted-foreground">
          <a href="/contracts" className="hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent">
            Contratos
          </a>
          <a href="/notifications" className="hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent">
            Notificaciones
          </a>
        </nav>
      </aside>
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-void px-6 text-center">
      <div className="h-16 w-16 rounded-full border-2 border-trabajo shadow-neon animate-pulseGlow" />
      <h1 className="font-display text-2xl tracking-wide text-white">ACCESO RESTRINGIDO</h1>
      <p className="max-w-xs text-sm text-white/50">
        Este espacio es privado. Usa tu acceso directo, o ingresa la clave manualmente.
      </p>
      {params.error && (
        <p className="text-sm font-semibold text-warn">Clave incorrecta.</p>
      )}
      <form action="/api/enter" method="POST" className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          name="key"
          placeholder="Clave de acceso"
          autoComplete="off"
          className="w-full rounded-2xl border border-edge bg-panel px-5 py-4 text-center text-lg text-white outline-none focus:border-trabajo"
        />
        <button
          type="submit"
          className="w-full rounded-2xl bg-trabajo py-4 text-lg font-bold text-void shadow-neon active:scale-95 transition-transform"
        >
          ENTRAR
        </button>
      </form>
    </main>
  );
}

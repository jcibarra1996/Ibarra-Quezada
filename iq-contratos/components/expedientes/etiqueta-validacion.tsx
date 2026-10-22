export function EtiquetaValidacion({ estado }: { estado: string }) {
  return estado === "validado" ? (
    <span className="inline-flex h-6 items-center rounded-full bg-bajo-suave px-2.5 text-[12px] font-medium text-bajo">Validado por Legal</span>
  ) : (
    <span className="inline-flex h-6 items-center rounded-full bg-medio-suave px-2.5 text-[12px] font-medium text-medio">Por validar</span>
  );
}

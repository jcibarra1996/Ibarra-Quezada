import { EncabezadoPagina } from "@/components/ui/encabezado";

export const metadata = { title: "Reportes" };

export default function Pagina() {
  return (
    <div>
      <EncabezadoPagina titulo="Reportes" />
      <p className="px-8 py-6 text-[13.5px] text-secundario">Esta sección se construye en una etapa posterior.</p>
    </div>
  );
}

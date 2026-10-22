"use client";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { conectarMifiel, desconectarMifiel } from "@/app/(app)/firmas/acciones";
import { ConectarAvisos } from "./conectar-avisos";

// Formulario de la dirección jurídica para conectar la cuenta de Mifiel de la organización.
export function ConexionMifiel({ conectado, avisosConectados }: { conectado: boolean; avisosConectados: boolean }) {
  const [editando, setEditando] = useState(!conectado);
  const [appId, setAppId] = useState("");
  const [secreto, setSecreto] = useState("");
  const [entorno, setEntorno] = useState<"sandbox" | "produccion">("sandbox");
  const [mensaje, setMensaje] = useState("");
  const [pendiente, iniciar] = useTransition();
  const control = "h-9 w-full rounded-md border border-linea-fuerte bg-white px-2.5 text-[13px] outline-none focus:border-terracota";

  if (!editando) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[12.5px]">
        {avisosConectados ? <span className="text-bajo">Avisos automáticos conectados</span> : <ConectarAvisos />}
        <button className="text-secundario hover:text-tinta hover:underline" onClick={() => setEditando(true)}>
          Cambiar credenciales
        </button>
        <button
          className="text-secundario hover:text-burgundy hover:underline"
          disabled={pendiente}
          onClick={() => {
            if (!window.confirm("¿Desconectar Mifiel? Los contratos que ya están en firma no se cancelan en Mifiel.")) return;
            iniciar(async () => {
              await desconectarMifiel();
              setEditando(true);
            });
          }}
        >
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-4 grid grid-cols-[1fr_1.4fr_200px_auto] items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          setMensaje("");
          const r = await conectarMifiel({ appId, secreto, entorno });
          if (!r.ok) return setMensaje(r.error);
          setSecreto("");
          setEditando(false);
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-secundario">APP_ID</span>
        <input value={appId} onChange={(e) => setAppId(e.target.value)} className={`${control} font-mono`} autoComplete="off" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-secundario">APP_SECRET</span>
        <input type="password" value={secreto} onChange={(e) => setSecreto(e.target.value)} className={`${control} font-mono`} autoComplete="off" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-secundario">Ambiente</span>
        <select value={entorno} onChange={(e) => setEntorno(e.target.value as "sandbox" | "produccion")} className={control}>
          <option value="sandbox">Pruebas (sin validez legal)</option>
          <option value="produccion">Producción</option>
        </select>
      </label>
      <div className="flex gap-2">
        {conectado && (
          <Boton type="button" variante="fantasma" onClick={() => setEditando(false)}>
            Cancelar
          </Boton>
        )}
        <Boton type="submit" variante="primario" className="h-9" disabled={pendiente || !appId || !secreto}>
          {pendiente ? "Comprobando con Mifiel..." : "Conectar"}
        </Boton>
      </div>
      <p className="col-span-4 text-[12px] text-secundario">
        Se generan en Mifiel, en Ajustes, Access tokens. Antes de guardarlas se comprueban con Mifiel; quedan cifradas y no vuelven a mostrarse.
      </p>
      {mensaje && <p className="col-span-4 text-[12.5px] text-burgundy">{mensaje}</p>}
    </form>
  );
}

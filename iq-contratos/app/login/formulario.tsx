"use client";
import { useActionState, useRef } from "react";
import { iniciarSesion } from "./acciones";

interface UsuarioDemo {
  correo: string;
  nombre: string;
  rol: string;
}

export function FormularioIngreso({ demo }: { demo: { usuarios: UsuarioDemo[]; contrasena: string } | null }) {
  const [estado, accion, enviando] = useActionState(iniciarSesion, undefined);
  const correo = useRef<HTMLInputElement>(null);
  const contrasena = useRef<HTMLInputElement>(null);

  return (
    <form action={accion} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium">Correo</span>
        <input
          ref={correo}
          name="correo"
          type="email"
          autoComplete="username"
          required
          className="h-10 w-full rounded-md border border-linea-fuerte bg-white px-3 text-[14px] outline-none focus:border-terracota"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium">Contraseña</span>
        <input
          ref={contrasena}
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 w-full rounded-md border border-linea-fuerte bg-white px-3 text-[14px] outline-none focus:border-terracota"
        />
      </label>
      {estado?.error && <p className="text-[13px] text-burgundy">{estado.error}</p>}
      <button
        disabled={enviando}
        className="h-10 w-full rounded-md bg-terracota text-[14px] font-medium text-white hover:bg-terracota-oscuro disabled:opacity-60"
      >
        {enviando ? "Ingresando..." : "Ingresar"}
      </button>

      {demo && (
        <div className="mt-6 border-t border-linea pt-5">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-secundario">Usuarios de demostración</p>
          <div className="space-y-1.5">
            {demo.usuarios.map((u) => (
              <button
                type="button"
                key={u.correo}
                onClick={() => {
                  if (correo.current) correo.current.value = u.correo;
                  if (contrasena.current) contrasena.current.value = demo.contrasena;
                }}
                className="flex w-full items-center justify-between rounded-md border border-linea bg-white px-3 py-2 text-left hover:border-linea-fuerte"
              >
                <span className="text-[13px] font-medium">{u.nombre}</span>
                <span className="text-[12px] text-secundario">{u.rol}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

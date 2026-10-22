// Registro de eventos técnicos. Nunca recibe texto del contrato: solo identificadores,
// conteos y mensajes de error genéricos.
type Detalle = Record<string, string | number | boolean | null | undefined>;

export function registrar(evento: string, detalle: Detalle = {}) {
  console.info(JSON.stringify({ evento, ...detalle, t: new Date().toISOString() }));
}

export function registrarError(evento: string, error: unknown, detalle: Detalle = {}) {
  const nombre = error instanceof Error ? error.name : "Error";
  // El mensaje de error de librerías externas podría incluir fragmentos del documento;
  // solo se registra el tipo y, si existe, el código.
  const codigo = typeof error === "object" && error && "status" in error ? String((error as { status: unknown }).status) : undefined;
  console.error(JSON.stringify({ evento, error: nombre, codigo, ...detalle, t: new Date().toISOString() }));
}

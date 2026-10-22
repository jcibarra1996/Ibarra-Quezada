// Datos de la empresa ficticia de demostración. Se usan en la semilla y,
// solo con MODO_DEMO=true, como accesos rápidos en la pantalla de ingreso.
export const ORG_DEMO = "EMPRESA CLIENTE, S.A. DE C.V.";
export const CONTRASENA_DEMO = "Demo-IQ-2026";

export const USUARIOS_DEMO = [
  { correo: "directora@empresa-cliente.example", nombre: "Laura Méndez", puesto: "Directora jurídica", rol: "Director jurídico", clave: "director_juridico" as const, area: "Jurídico" },
  { correo: "abogado@empresa-cliente.example", nombre: "Carlos Rivas", puesto: "Abogado corporativo", rol: "Abogado", clave: "abogado" as const, area: "Jurídico" },
  { correo: "compras@empresa-cliente.example", nombre: "Sofía Herrera", puesto: "Gerente de Compras", rol: "Negocio", clave: "negocio" as const, area: "Compras" },
];

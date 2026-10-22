import { defineConfig } from "vitest/config";
import path from "node:path";

// Las pruebas de integración necesitan Supabase local corriendo; se ejecutan aparte
// con `npm run test:integracion`.
const integracion = process.env.INTEGRACION === "1";

export default defineConfig({
  test: {
    include: integracion ? ["tests/integracion/**/*.test.ts"] : ["tests/**/*.test.ts"],
    exclude: integracion ? [] : ["tests/integracion/**"],
    environment: "node",
    testTimeout: integracion ? 30_000 : 5_000,
    fileParallelism: !integracion,
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
});

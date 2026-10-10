// Configuracion de la CLI de Prisma (migraciones, studio, seed).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Las migraciones van por la conexion DIRECTA de Neon (sin pooler)
    url: process.env["DIRECT_URL"],
  },
});

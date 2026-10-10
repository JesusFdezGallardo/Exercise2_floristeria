// Una UNICA instancia de Prisma para toda la app.
// En desarrollo Next recarga los modulos en caliente: sin este truco abririamos
// una conexion nueva a la base de datos en cada guardado.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente() {
  // Prisma 7 habla con Postgres a traves de un "driver adapter" (aqui, el driver pg)
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;

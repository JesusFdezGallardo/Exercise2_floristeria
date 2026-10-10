// Ensena el SQL que genera Prisma para una busqueda del catalogo.
//   npx tsx scripts/ver-sql-catalogo.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  log: [{ emit: "event", level: "query" }],
});

prisma.$on("query", (e) => {
  console.log("SQL:", e.query.replace(/"public"\./g, ""));
  console.log("PARAMETROS:", e.params, `(${e.duration} ms)`);
});

async function main() {
  // lo mismo que /?q=reloj&categoria=relojes&min=50&max=100
  const productos = await prisma.producto.findMany({
    where: {
      nombre: { contains: "reloj", mode: "insensitive" },
      categoria: { slug: "relojes" },
      precio: { gte: 5000, lte: 10000 },
    },
    select: { nombre: true, precio: true },
    orderBy: { precio: "asc" },
  });
  console.log("RESULTADO:", productos);
}

main().finally(() => prisma.$disconnect());

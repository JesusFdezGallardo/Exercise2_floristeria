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
  // lo mismo que /?q=rosas&categoria=amor&min=40&max=60
  const productos = await prisma.producto.findMany({
    where: {
      nombreBusqueda: { contains: "rosas" }, // sin tildes: ver src/lib/busqueda.ts
      categoria: { slug: "amor" },
      precio: { gte: 4000, lte: 6000 },
    },
    select: { nombre: true, precio: true },
    orderBy: { precio: "asc" },
  });
  console.log("RESULTADO:", productos);
}

main().finally(() => prisma.$disconnect());

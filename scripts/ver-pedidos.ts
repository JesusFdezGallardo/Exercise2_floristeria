// Lista los ultimos pedidos con su estado (para comprobar lo que hace el webhook).
//   npx tsx scripts/ver-pedidos.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const pedidos = await prisma.pedido.findMany({
    orderBy: { id: "desc" },
    take: 8,
    include: { lineas: { include: { producto: { select: { nombre: true, stock: true } } } } },
  });
  for (const p of pedidos) {
    const lineas = p.lineas.map((l) => `${l.cantidad}x ${l.producto.nombre}`).join(", ");
    console.log(`#${p.id}  ${p.estado.padEnd(9)} ${(p.total / 100).toFixed(2).padStart(7)} EUR  ${p.email.padEnd(26)} ${lineas}`);
  }
  const stock = await prisma.producto.findMany({ where: { id: { in: [1, 4] } }, select: { nombre: true, stock: true } });
  console.log("Stock ahora:", stock.map((s) => `${s.nombre} = ${s.stock}`).join(" · "));
}

main().finally(() => prisma.$disconnect());

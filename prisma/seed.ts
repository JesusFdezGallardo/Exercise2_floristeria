// Datos de ejemplo de la floristeria: 4 categorias por ocasion y 10 ramos y centros (prisma/catalogo-datos.ts).
//   npx prisma db seed      (o npm run seed)
// Es idempotente: borra y vuelve a crear, asi se puede lanzar tantas veces como haga falta.
// OJO: borra tambien TODOS los pedidos.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizar } from "../src/lib/busqueda";
import { CATEGORIAS, PRODUCTOS } from "./catalogo-datos";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Vaciamos las 4 tablas Y reiniciamos los contadores de id (RESTART IDENTITY).
  // Con deleteMany los id seguian creciendo (13, 14...) y los enlaces /producto/1 dejaban de existir.
  await prisma.$executeRaw`TRUNCATE "LineaPedido", "Pedido", "Producto", "Categoria" RESTART IDENTITY CASCADE`;

  for (const c of CATEGORIAS) {
    await prisma.categoria.create({
      data: {
        ...c,
        productos: {
          create: PRODUCTOS.filter((p) => p.cat === c.slug).map((p) => ({
            nombre: p.nombre,
            nombreBusqueda: normalizar(p.nombre), // para la busqueda sin tildes
            slug: p.slug,
            descripcion: p.descripcion,
            precio: p.precio,
            stock: p.stock,
            imagen: `/productos/${p.slug}.svg`,
          })),
        },
      },
    });
  }

  const porCategoria = await prisma.categoria.findMany({
    select: { nombre: true, _count: { select: { productos: true } } },
    orderBy: { id: "asc" },
  });
  for (const c of porCategoria) console.log(`  ${c.nombre.padEnd(14)} ${c._count.productos} productos`);
  console.log(`Seed completado: ${await prisma.categoria.count()} categorias, ${await prisma.producto.count()} productos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

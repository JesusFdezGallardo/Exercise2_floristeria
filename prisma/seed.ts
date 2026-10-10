// Datos de ejemplo de la Tienda Volta (la misma tienda del agente de la S13).
//   npx prisma db seed      (o npm run seed)
// Es idempotente: borra y vuelve a crear, asi se puede lanzar tantas veces como haga falta.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CATEGORIAS = [
  { nombre: "Audio", slug: "audio" },
  { nombre: "Relojes", slug: "relojes" },
  { nombre: "Ropa", slug: "ropa" },
  { nombre: "Calzado", slug: "calzado" },
];

// precio en CENTIMOS
const PRODUCTOS = [
  { cat: "audio", nombre: "Auriculares Volta Pulse", slug: "auriculares-volta-pulse", precio: 4990, stock: 25,
    descripcion: "Auriculares inalambricos con cancelacion de ruido y 30 horas de bateria. Marca propia: 1 ano extra de garantia." },
  { cat: "audio", nombre: "Auriculares Volta Studio", slug: "auriculares-volta-studio", precio: 12000, stock: 8,
    descripcion: "Diadema de estudio con sonido de alta resolucion y almohadillas de espuma viscoelastica." },
  { cat: "audio", nombre: "Altavoz Bluetooth Mini", slug: "altavoz-bluetooth-mini", precio: 2995, stock: 40,
    descripcion: "Altavoz resistente al agua (IPX7), 12 horas de musica y correa para la mochila." },
  { cat: "relojes", nombre: "Reloj Volta Sport", slug: "reloj-volta-sport", precio: 8990, stock: 15,
    descripcion: "Reloj deportivo con GPS, pulso y 7 dias de autonomia. Marca propia: 1 ano extra de garantia." },
  { cat: "relojes", nombre: "Reloj Volta Classic", slug: "reloj-volta-classic", precio: 15900, stock: 5,
    descripcion: "Reloj analogico de acero con cristal de zafiro y correa de piel." },
  { cat: "relojes", nombre: "Correa de silicona", slug: "correa-silicona", precio: 1490, stock: 60,
    descripcion: "Correa de recambio compatible con los relojes Volta. Varios colores." },
  { cat: "ropa", nombre: "Camiseta basica", slug: "camiseta-basica", precio: 1995, stock: 80,
    descripcion: "Camiseta de algodon organico, corte ajustado. Tallas S a XL: si dudas, elige la mayor." },
  { cat: "ropa", nombre: "Sudadera con capucha", slug: "sudadera-capucha", precio: 3990, stock: 30,
    descripcion: "Sudadera de felpa con capucha y bolsillo canguro." },
  { cat: "ropa", nombre: "Vaqueros slim", slug: "vaqueros-slim", precio: 4995, stock: 22,
    descripcion: "Vaqueros de corte slim. Cintura en pulgadas (28 a 38), largo estandar 32." },
  { cat: "calzado", nombre: "Zapatillas urbanas", slug: "zapatillas-urbanas", precio: 6990, stock: 18,
    descripcion: "Zapatillas de piel sintetica. Horma estrecha: si tienes el pie ancho, pide medio numero mas." },
  { cat: "calzado", nombre: "Zapatillas running", slug: "zapatillas-running", precio: 9490, stock: 12,
    descripcion: "Zapatillas ligeras con amortiguacion para correr por asfalto." },
  { cat: "calzado", nombre: "Chanclas de piscina", slug: "chanclas-piscina", precio: 990, stock: 0,
    descripcion: "Chanclas de goma antideslizante. Agotadas hasta el verano." },
];

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
  for (const c of porCategoria) console.log(`  ${c.nombre.padEnd(8)} ${c._count.productos} productos`);
  console.log(`Seed completado: ${await prisma.categoria.count()} categorias, ${await prisma.producto.count()} productos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

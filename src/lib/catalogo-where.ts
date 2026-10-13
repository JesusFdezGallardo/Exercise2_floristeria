// El where de Prisma del catalogo, a partir de los filtros ya validados de la URL.
// Archivo aparte de catalogo.ts (que usa Prisma) para poder testearlo sin base de datos.
// SIEMPRE lleva visible: true: un producto oculto desde el admin no sale ni en la lista ni en la busqueda.
import type { Prisma } from "../generated/prisma/client";
import { escaparLike, normalizar } from "./busqueda";
import type { Filtros } from "./catalogo";

export function whereDe(f: Filtros): Prisma.ProductoWhereInput {
  const where: Prisma.ProductoWhereInput = { visible: true };
  // Sin tildes ni mayusculas: "peonias" encuentra "Ramo de peonías rosas" (ver src/lib/busqueda.ts)
  if (f.q) where.nombreBusqueda = { contains: escaparLike(normalizar(f.q)) }; // LIKE '%q%' sobre el nombre normalizado
  if (f.categoria) where.categoria = { slug: f.categoria };
  if (f.min !== null || f.max !== null) {
    // el usuario escribe euros; en la base guardamos centimos
    where.precio = {
      ...(f.min !== null && { gte: Math.round(f.min * 100) }),
      ...(f.max !== null && { lte: Math.round(f.max * 100) }),
    };
  }
  return where;
}

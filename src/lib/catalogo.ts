// Busqueda y filtros del catalogo: se resuelven en el SERVIDOR con Prisma a partir de la URL.
//   /?q=reloj&categoria=relojes&min=50&max=100&orden=precio-desc
import type { Prisma } from "@/generated/prisma/client";
import { leerOrden, orderByDe, type Orden } from "@/lib/orden";
import { prisma } from "@/lib/prisma";

export type Filtros = { q: string; categoria: string; min: number | null; max: number | null; orden: Orden };

// Los searchParams llegan como texto (o lista de textos) y pueden venir de cualquiera: se validan
export function leerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  const euros = (v: string) => (v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);
  return {
    q: uno(sp.q),
    categoria: uno(sp.categoria),
    min: euros(uno(sp.min)),
    max: euros(uno(sp.max)),
    orden: leerOrden(sp.orden),
  };
}

export async function buscarProductos(f: Filtros) {
  const where: Prisma.ProductoWhereInput = {};
  if (f.q) where.nombre = { contains: f.q, mode: "insensitive" }; // ILIKE '%q%'
  if (f.categoria) where.categoria = { slug: f.categoria };
  if (f.min !== null || f.max !== null) {
    // el usuario escribe euros; en la base guardamos centimos
    where.precio = {
      ...(f.min !== null && { gte: Math.round(f.min * 100) }),
      ...(f.max !== null && { lte: Math.round(f.max * 100) }),
    };
  }
  return prisma.producto.findMany({
    where,
    include: { categoria: { select: { nombre: true } } },
    orderBy: orderByDe(f.orden),
  });
}

export function listarCategorias() {
  return prisma.categoria.findMany({ orderBy: { id: "asc" } });
}

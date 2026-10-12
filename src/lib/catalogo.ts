// Busqueda y filtros del catalogo: se resuelven en el SERVIDOR con Prisma a partir de la URL.
//   /?q=rosas&categoria=amor&min=40&max=60&orden=precio-desc
// El where se construye en catalogo-where.ts (puro, con test) y siempre deja fuera los productos ocultos.
import { whereDe } from "@/lib/catalogo-where";
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
  return prisma.producto.findMany({
    where: whereDe(f),
    include: { categoria: { select: { nombre: true } } },
    orderBy: orderByDe(f.orden),
  });
}

export function listarCategorias() {
  return prisma.categoria.findMany({ orderBy: { id: "asc" } });
}

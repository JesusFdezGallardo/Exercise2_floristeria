// Orden del catalogo: /?orden=precio-desc
// El valor llega de la URL (de cualquiera): solo se aceptan las claves de esta lista cerrada.
// Archivo aparte de catalogo.ts para poder testearlo sin base de datos.
import type { Prisma } from "@/generated/prisma/client";

const ORDENES = {
  "precio-asc": { etiqueta: "Precio ↑", campo: { precio: "asc" } },
  "precio-desc": { etiqueta: "Precio ↓", campo: { precio: "desc" } },
  nombre: { etiqueta: "Nombre", campo: { nombre: "asc" } },
} satisfies Record<string, { etiqueta: string; campo: Prisma.ProductoOrderByWithRelationInput }>;

export type Orden = keyof typeof ORDENES;

// El orden que tenia el catalogo antes de existir ?orden=; no se escribe en la URL
export const ORDEN_POR_DEFECTO: Orden = "precio-asc";

// Para pintar los enlaces de "Ordenar por"
export const LISTA_ORDENES = Object.entries(ORDENES).map(([valor, o]) => ({ valor: valor as Orden, etiqueta: o.etiqueta }));

export function leerOrden(v: string | string[] | undefined): Orden {
  const valor = (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  // Object.hasOwn y no `in`: "toString" no debe colarse como orden valido
  return Object.hasOwn(ORDENES, valor) ? (valor as Orden) : ORDEN_POR_DEFECTO;
}

// Desempate por id: dos productos con el mismo precio salen siempre en el mismo orden
export function orderByDe(orden: Orden): Prisma.ProductoOrderByWithRelationInput[] {
  return [ORDENES[orden].campo, { id: "asc" }];
}

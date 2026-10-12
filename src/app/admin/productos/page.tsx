// Panel de admin: lista de productos. Primero los agotados (lo que hay que reponer), despues por nombre.
// Incluye los ocultos: si no, no habria forma de volver a mostrarlos.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeProducto } from "@/components/badge-producto";
import { NavegacionAdmin } from "@/components/navegacion-admin";
import { SinAcceso } from "@/components/sin-acceso";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearPrecio } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { ordenarParaAdmin } from "@/lib/productos-admin";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Productos · Admin" };
export const dynamic = "force-dynamic";

export default async function PanelProductos() {
  // La cookie ya la exige el middleware; aqui se comprueba que la sesion es valida y que el rol es ADMIN
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?callbackUrl=/admin/productos");
  if (usuario.rol !== "ADMIN") return <SinAcceso />;

  const productos = ordenarParaAdmin(
    await prisma.producto.findMany({ include: { categoria: { select: { nombre: true } } } }),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavegacionAdmin activa="productos" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Productos</h1>

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((p) => (
            // Toda la fila abre la ficha: el ::after del enlace se estira sobre la fila (relative), como en pedidos
            <TableRow key={p.id} className="relative">
              <TableCell>
                <Link href={`/admin/productos/${p.id}`}
                  className="font-medium underline underline-offset-4 after:absolute after:inset-0 after:content-['']">
                  {p.nombre}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{p.categoria.nombre}</TableCell>
              <TableCell className="text-right tabular-nums">{formatearPrecio(p.precio)}</TableCell>
              <TableCell className={`text-right tabular-nums ${p.stock <= 0 ? "font-semibold text-destructive" : ""}`}>
                {p.stock}
              </TableCell>
              <TableCell><BadgeProducto stock={p.stock} visible={p.visible} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

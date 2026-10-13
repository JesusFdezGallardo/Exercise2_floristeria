// Ficha de un producto en el admin: datos, reponer y corregir stock. Cada bloque es un formulario con su Server Action.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeProducto } from "@/components/badge-producto";
import { FormularioCorregirStock } from "@/components/formulario-corregir-stock";
import { FormularioProducto } from "@/components/formulario-producto";
import { FormularioReponer } from "@/components/formulario-reponer";
import { SinAcceso } from "@/components/sin-acceso";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { textoAvisosPendientes } from "@/lib/avisos";
import { listarCategorias } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";
import { precioParaEditar } from "@/lib/productos-admin";
import { usuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Producto #${(await params).id} · Admin` };
}

export default async function FichaProductoAdmin({ params }: Props) {
  const usuario = await usuarioActual();
  if (!usuario) redirect(`/entrar?callbackUrl=/admin/productos/${encodeURIComponent((await params).id)}`);
  if (usuario.rol !== "ADMIN") return <SinAcceso />;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  // Sin filtrar por visible: los ocultos tambien se editan (si no, no habria forma de volver a mostrarlos)
  const [producto, categorias, avisosPendientes] = await Promise.all([
    prisma.producto.findUnique({ where: { id } }),
    listarCategorias(),
    prisma.avisoReposicion.count({ where: { productoId: id, enviadoEn: null } }),
  ]);
  if (!producto) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <Link href="/admin/productos" className="text-sm text-muted-foreground hover:text-foreground">← Productos</Link>
      <div className="flex items-center gap-4">
        <Image src={producto.imagen} alt="" width={64} height={64} className="size-16 rounded-lg object-cover" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{producto.nombre}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <BadgeProducto stock={producto.stock} visible={producto.visible} />
            {avisosPendientes > 0 && (
              <span className="text-muted-foreground">{textoAvisosPendientes(avisosPendientes)}</span>
            )}
            {producto.visible && (
              <Link href={`/producto/${producto.id}`} className="text-muted-foreground underline underline-offset-4">
                Ver en la tienda
              </Link>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
        <CardContent>
          <FormularioProducto
            id={producto.id}
            categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
            inicial={{
              nombre: producto.nombre,
              descripcion: producto.descripcion,
              precio: precioParaEditar(producto.precio),
              categoriaId: String(producto.categoriaId),
              visible: producto.visible,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Reponer</CardTitle></CardHeader>
        <CardContent><FormularioReponer id={producto.id} stock={producto.stock} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Corregir stock</CardTitle></CardHeader>
        <CardContent><FormularioCorregirStock id={producto.id} stock={producto.stock} /></CardContent>
      </Card>
    </main>
  );
}

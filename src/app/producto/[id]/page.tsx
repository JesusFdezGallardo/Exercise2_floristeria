// Detalle de producto: ruta dinamica. La carpeta [id] captura el trozo de URL: /producto/4 -> id = "4"
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComprarProducto } from "@/components/comprar-producto";
import { Badge } from "@/components/ui/badge";
import { formatearPrecio } from "@/lib/formato";
import { prisma } from "@/lib/prisma";

// En Next 15 params es una Promise
type Props = { params: Promise<{ id: string }> };

async function cargarProducto(idTexto: string) {
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) return null; // /producto/abc -> 404 sin tocar la base
  return prisma.producto.findUnique({ where: { id }, include: { categoria: true } });
}

// El titulo de la pestana del navegador sale del propio producto
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const producto = await cargarProducto((await params).id);
  return { title: producto ? `${producto.nombre} · Tienda Volta` : "Producto no encontrado" };
}

export default async function PaginaProducto({ params }: Props) {
  const producto = await cargarProducto((await params).id);
  if (!producto) notFound(); // pinta app/not-found.tsx con estado HTTP 404

  const agotado = producto.stock === 0;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Volver al catalogo
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <Image
          src={producto.imagen}
          alt={producto.nombre}
          width={800}
          height={800}
          priority // la imagen principal se carga la primera
          className="aspect-square w-full rounded-2xl object-cover"
        />
        <div className="flex flex-col gap-4">
          <Link href={`/?categoria=${producto.categoria.slug}`}>
            <Badge variant="secondary">{producto.categoria.nombre}</Badge>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{producto.nombre}</h1>
          <p className="text-3xl font-semibold">{formatearPrecio(producto.precio)}</p>
          <p className="leading-relaxed text-muted-foreground">{producto.descripcion}</p>
          <p className={`text-sm ${agotado ? "text-destructive" : "text-emerald-700"}`}>
            {agotado ? "Agotado" : `En stock: ${producto.stock} unidades`}
          </p>
          <ComprarProducto
            producto={{ id: producto.id, nombre: producto.nombre, precio: producto.precio, imagen: producto.imagen, stock: producto.stock }}
          />
        </div>
      </div>
    </main>
  );
}

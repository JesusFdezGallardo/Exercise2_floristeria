"use client";
// Lineas del carrito, cantidades y total. Todo sale del store de Zustand.
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { BotonPagar } from "@/components/boton-pagar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatearPrecio } from "@/lib/formato";
import { calcularTotal, contarArticulos, useCarrito } from "@/store/carrito";

export function VistaCarrito() {
  const { lineas, cambiarCantidad, quitar, vaciar } = useCarrito();

  if (lineas.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">Tu carrito esta vacio.</p>
        <Button render={<Link href="/" />} nativeButton={false}>
          Ver el catalogo
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      {lineas.map((l) => (
        <div key={l.id} className="flex items-center gap-4">
          <Image src={l.imagen} alt={l.nombre} width={80} height={80} className="size-20 rounded-lg" />
          <div className="flex-1">
            <Link href={`/producto/${l.id}`} className="font-medium hover:underline">
              {l.nombre}
            </Link>
            <p className="text-sm text-muted-foreground">{formatearPrecio(l.precio)} / unidad</p>
          </div>
          <div className="flex items-center rounded-lg border">
            <Button variant="ghost" size="icon-sm" aria-label="Menos" onClick={() => cambiarCantidad(l.id, l.cantidad - 1)}>
              <Minus />
            </Button>
            <span className="w-8 text-center tabular-nums">{l.cantidad}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Mas" disabled={l.cantidad >= l.stock}
              onClick={() => cambiarCantidad(l.id, l.cantidad + 1)}>
              <Plus />
            </Button>
          </div>
          <p className="w-24 text-right font-semibold tabular-nums">{formatearPrecio(l.precio * l.cantidad)}</p>
          <Button variant="ghost" size="icon" aria-label={`Quitar ${l.nombre}`} onClick={() => quitar(l.id)}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <Separator />
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={vaciar}>
          Vaciar carrito
        </Button>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{contarArticulos(lineas)} articulos</p>
          <p className="text-2xl font-bold">{formatearPrecio(calcularTotal(lineas))}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <BotonPagar lineas={lineas} />
      </div>
      <p className="text-right text-xs text-muted-foreground">Pago seguro con Stripe (modo test: no se cobra nada)</p>
    </div>
  );
}

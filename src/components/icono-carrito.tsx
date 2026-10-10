"use client";
// Icono del carrito de la cabecera: se actualiza en vivo leyendo el store de Zustand.
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { contarArticulos, useCarrito } from "@/store/carrito";

// El globo con el numero de articulos
const globo =
  "absolute -right-2 -top-2 grid size-5 place-items-center rounded-full " +
  "bg-primary text-[11px] font-semibold text-primary-foreground";

export function IconoCarrito() {
  // El selector hace que este componente solo se repinte cuando cambia el numero
  const articulos = useCarrito((s) => contarArticulos(s.lineas));

  return (
    <Link href="/carrito" className="relative" aria-label={`Carrito: ${articulos} articulos`}>
      <ShoppingBag className="size-5" />
      {articulos > 0 && (
        <span className={globo}>{articulos}</span>
      )}
    </Link>
  );
}

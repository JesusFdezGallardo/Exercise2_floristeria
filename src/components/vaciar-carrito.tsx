"use client";
// Vacia el carrito del navegador al llegar a la pagina de exito. No pinta nada.
import { useEffect } from "react";
import { useCarrito } from "@/store/carrito";

export function VaciarCarrito() {
  const vaciar = useCarrito((s) => s.vaciar);
  useEffect(() => {
    vaciar();
  }, [vaciar]);
  return null;
}

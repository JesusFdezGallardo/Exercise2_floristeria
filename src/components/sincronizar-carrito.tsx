"use client";
// Elige el carrito segun quien ha entrado y, al entrar, le suma lo que hubiera en el carrito anonimo.
// Sin sesion: "carrito-rincon". Con sesion: "carrito-rincon:<id>". No pinta nada.
import { useEffect } from "react";
import { CLAVE_CARRITO, claveCarrito, juntarCarritos, useCarrito, type LineaCarrito } from "@/store/carrito";

// Lo que persist guarda en localStorage es {"state":{"lineas":[...]},"version":0}
function leerLineas(clave: string): LineaCarrito[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave) ?? "null");
    return Array.isArray(guardado?.state?.lineas) ? guardado.state.lineas : [];
  } catch {
    return [];
  }
}

export function SincronizarCarrito({ usuarioId }: { usuarioId: number | null }) {
  useEffect(() => {
    const clave = claveCarrito(usuarioId);
    let lineas = leerLineas(clave);
    if (usuarioId !== null) {
      // Lo anonimo se suma una sola vez: despues se vacia, y las siguientes visitas no suman nada
      const anonimo = leerLineas(CLAVE_CARRITO);
      if (anonimo.length > 0) {
        lineas = juntarCarritos(anonimo, lineas);
        localStorage.removeItem(CLAVE_CARRITO);
      }
    }
    // Primero se cambia la clave y despues el estado: setState escribe en la clave NUEVA
    // (al salir, el carrito del usuario se queda guardado en la suya y en memoria entra el anonimo)
    useCarrito.persist.setOptions({ name: clave });
    useCarrito.setState({ lineas });
  }, [usuarioId]);
  return null;
}

// Estado global del carrito con Zustand: un store = estado + acciones, sin Provider ni Context.
// Con persist, el carrito se guarda en localStorage y sobrevive a recargas y a cerrar el navegador.
// Hay un carrito por identidad: "carrito-rincon" sin sesion y "carrito-rincon:<usuarioId>" con sesion.
// El store NO se carga solo (skipHydration): lo carga SincronizarCarrito cuando sabe quien ha entrado.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LineaCarrito = { id: number; nombre: string; precio: number; imagen: string; cantidad: number; stock: number };

export const CLAVE_CARRITO = "carrito-rincon"; // cambiarla invalida los carritos guardados (ver NOTAS)

export const claveCarrito = (usuarioId: number | null) =>
  usuarioId === null ? CLAVE_CARRITO : `${CLAVE_CARRITO}:${usuarioId}`;

type EstadoCarrito = {
  lineas: LineaCarrito[];
  anadir: (producto: Omit<LineaCarrito, "cantidad">, cantidad?: number) => void;
  cambiarCantidad: (id: number, cantidad: number) => void;
  quitar: (id: number) => void;
  vaciar: () => void;
};

export const useCarrito = create<EstadoCarrito>()(
  persist(
    (set) => ({
      lineas: [],

      anadir: (producto, cantidad = 1) =>
        set((estado) => {
          const existente = estado.lineas.find((l) => l.id === producto.id);
          if (existente) {
            // ya estaba: sumamos, sin pasar del stock
            return {
              lineas: estado.lineas.map((l) =>
                l.id === producto.id ? { ...l, cantidad: Math.min(l.cantidad + cantidad, l.stock) } : l
              ),
            };
          }
          return { lineas: [...estado.lineas, { ...producto, cantidad: Math.min(cantidad, producto.stock) }] };
        }),

      cambiarCantidad: (id, cantidad) =>
        set((estado) => ({
          lineas: estado.lineas
            .map((l) => (l.id === id ? { ...l, cantidad: Math.min(cantidad, l.stock) } : l))
            .filter((l) => l.cantidad > 0), // cantidad 0 = quitar
        })),

      quitar: (id) => set((estado) => ({ lineas: estado.lineas.filter((l) => l.id !== id) })),

      vaciar: () => set({ lineas: [] }),
    }),
    {
      name: CLAVE_CARRITO, // la clave en localStorage; SincronizarCarrito la cambia segun la sesion
      skipHydration: true, // no cargar hasta saber de quien es el carrito
      storage: createJSONStorage(() => localStorage),
      partialize: (estado) => ({ lineas: estado.lineas }), // solo los datos, no las funciones
    }
  )
);

// Valores derivados: se calculan, no se guardan (asi nunca se desincronizan)
export const contarArticulos = (lineas: LineaCarrito[]) => lineas.reduce((n, l) => n + l.cantidad, 0);
export const calcularTotal = (lineas: LineaCarrito[]) => lineas.reduce((t, l) => t + l.precio * l.cantidad, 0);

// Al entrar: el carrito anonimo se SUMA al del usuario. Mismo producto = una linea, sin pasar del stock
// (el mayor de los dos guardados). De una linea repetida se quedan los datos del anonimo, que son los mas recientes.
export function juntarCarritos(anonimo: LineaCarrito[], usuario: LineaCarrito[]): LineaCarrito[] {
  const resultado = usuario.map((l) => ({ ...l }));
  for (const a of anonimo) {
    const i = resultado.findIndex((l) => l.id === a.id);
    if (i === -1) {
      resultado.push({ ...a, cantidad: Math.min(a.cantidad, a.stock) });
    } else {
      const stock = Math.max(resultado[i].stock, a.stock);
      resultado[i] = { ...a, stock, cantidad: Math.min(resultado[i].cantidad + a.cantidad, stock) };
    }
  }
  return resultado.filter((l) => l.cantidad > 0);
}

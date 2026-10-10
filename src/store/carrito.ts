// Estado global del carrito con Zustand: un store = estado + acciones, sin Provider ni Context.
// Con persist, el carrito se guarda en localStorage y sobrevive a recargas y a cerrar el navegador.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LineaCarrito = { id: number; nombre: string; precio: number; imagen: string; cantidad: number; stock: number };

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
      name: "carrito-volta", // la clave en localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (estado) => ({ lineas: estado.lineas }), // solo los datos, no las funciones
    }
  )
);

// Valores derivados: se calculan, no se guardan (asi nunca se desincronizan)
export const contarArticulos = (lineas: LineaCarrito[]) => lineas.reduce((n, l) => n + l.cantidad, 0);
export const calcularTotal = (lineas: LineaCarrito[]) => lineas.reduce((t, l) => t + l.precio * l.cantidad, 0);

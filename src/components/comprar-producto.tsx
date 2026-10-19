"use client";
// Selector de cantidad + botones "anadir al carrito" y "pagar ahora". Es un componente de CLIENTE porque tiene estado
// (la cantidad) y eventos (clics), y porque escribe en el store del carrito, que vive en el navegador.
// Los dos botones anaden al carrito y salen de la ficha: "anadir" vuelve al catalogo y "pagar ahora" va a pagar
// TODO el carrito (pasando por el paso de entrega, que calcula el envio).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rutaPago } from "@/components/vista-carrito";
import { useCarrito } from "@/store/carrito";

type Props = {
  producto: { id: number; nombre: string; precio: number; imagen: string; stock: number };
  conSesion: boolean;
};

export function ComprarProducto({ producto, conSesion }: Props) {
  const [cantidad, setCantidad] = useState(1);
  const router = useRouter();
  const anadir = useCarrito((s) => s.anadir); // solo la accion: este componente no se repinta al cambiar el carrito
  const agotado = producto.stock <= 0; // sin reserva de stock puede quedar en -1
  const max = Math.min(producto.stock, 10);

  function alAnadir() {
    anadir(producto, cantidad);
    toast.success(`${cantidad} × ${producto.nombre} en el carrito`); // el Toaster esta en el layout: sigue al navegar
    router.push("/");
  }

  function alPagarAhora() {
    anadir(producto, cantidad);
    router.push(rutaPago(conSesion));
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-lg border">
        <Button variant="ghost" size="icon" aria-label="Menos" disabled={agotado || cantidad <= 1}
          onClick={() => setCantidad((c) => c - 1)}>
          <Minus />
        </Button>
        <span className="w-10 text-center tabular-nums">{agotado ? 0 : cantidad}</span>
        <Button variant="ghost" size="icon" aria-label="Más" disabled={agotado || cantidad >= max}
          onClick={() => setCantidad((c) => c + 1)}>
          <Plus />
        </Button>
      </div>
      <Button size="lg" disabled={agotado} onClick={alAnadir} className="px-6">
        {agotado ? "Agotado" : "Añadir al carrito"}
      </Button>
      <Button size="lg" variant="outline" disabled={agotado} onClick={alPagarAhora} className="px-6">
        Pagar ahora
      </Button>
    </div>
  );
}

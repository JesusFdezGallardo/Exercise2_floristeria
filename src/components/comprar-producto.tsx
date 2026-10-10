"use client";
// Selector de cantidad + boton "anadir al carrito". Es un componente de CLIENTE porque tiene estado
// (la cantidad) y eventos (clics), y porque escribe en el store del carrito, que vive en el navegador.
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCarrito } from "@/store/carrito";

type Props = { producto: { id: number; nombre: string; precio: number; imagen: string; stock: number } };

export function ComprarProducto({ producto }: Props) {
  const [cantidad, setCantidad] = useState(1);
  const anadir = useCarrito((s) => s.anadir); // solo la accion: este componente no se repinta al cambiar el carrito
  const agotado = producto.stock === 0;
  const max = Math.min(producto.stock, 10);

  function alPulsar() {
    anadir(producto, cantidad);
    toast.success(`${cantidad} × ${producto.nombre} en el carrito`);
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex items-center rounded-lg border">
        <Button variant="ghost" size="icon" aria-label="Menos" disabled={agotado || cantidad <= 1}
          onClick={() => setCantidad((c) => c - 1)}>
          <Minus />
        </Button>
        <span className="w-10 text-center tabular-nums">{agotado ? 0 : cantidad}</span>
        <Button variant="ghost" size="icon" aria-label="Mas" disabled={agotado || cantidad >= max}
          onClick={() => setCantidad((c) => c + 1)}>
          <Plus />
        </Button>
      </div>
      <Button size="lg" disabled={agotado} onClick={alPulsar} className="px-6">
        {agotado ? "Agotado" : "Anadir al carrito"}
      </Button>
    </div>
  );
}

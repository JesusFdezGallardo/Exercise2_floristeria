"use client";
// Boton "Pagar": llama a la Server Action con los ids y cantidades (NO con los precios).
import { useTransition } from "react";
import { toast } from "sonner";
import { crearCheckout } from "@/app/checkout/actions";
import { Button } from "@/components/ui/button";
import type { LineaCarrito } from "@/store/carrito";

export function BotonPagar({ lineas }: { lineas: LineaCarrito[] }) {
  const [pendiente, empezar] = useTransition();

  function pagar() {
    empezar(async () => {
      // Si todo va bien, la accion redirige a Stripe y esta linea nunca devuelve nada
      const r = await crearCheckout(lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })));
      if (r?.error) toast.error(r.error);
    });
  }

  return (
    <Button size="lg" onClick={pagar} disabled={pendiente} className="px-8">
      {pendiente ? "Preparando el pago..." : "Pagar con tarjeta"}
    </Button>
  );
}

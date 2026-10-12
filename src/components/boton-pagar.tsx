"use client";
// Boton "Pagar": llama a la Server Action con los ids y cantidades (NO con los precios).
// Sin sesion, lleva a /entrar y de vuelta al carrito (ya sumado) para que el cliente pague lo que ve.
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearCheckout } from "@/app/checkout/actions";
import { Button } from "@/components/ui/button";
import type { LineaCarrito } from "@/store/carrito";

const ENTRAR = "/entrar?callbackUrl=%2Fcarrito";

export function BotonPagar({ lineas, conSesion }: { lineas: LineaCarrito[]; conSesion: boolean }) {
  const [pendiente, empezar] = useTransition();
  const router = useRouter();

  if (!conSesion) {
    return (
      <Button size="lg" render={<Link href={ENTRAR} />} nativeButton={false} className="px-8">
        Entrar para pagar
      </Button>
    );
  }

  function pagar() {
    empezar(async () => {
      // Si todo va bien, la accion redirige a Stripe y esta linea nunca devuelve nada
      const r = await crearCheckout(lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })), {});
      if (r?.necesitaLogin) router.push(ENTRAR); // la sesion caduco mientras tanto
      else if (r?.error) toast.error(r.error);
    });
  }

  return (
    <Button size="lg" onClick={pagar} disabled={pendiente} className="px-8">
      {pendiente ? "Preparando el pago..." : "Pagar con tarjeta"}
    </Button>
  );
}

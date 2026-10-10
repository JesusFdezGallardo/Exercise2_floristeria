// Pagina de cancelacion: el cliente pulso "volver" en Stripe. No se cobra nada y el carrito se conserva.
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pago cancelado · Tienda Volta" };

export default function PaginaCancelado() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Pago cancelado</h1>
      <p className="text-muted-foreground">
        No te hemos cobrado nada. Tu carrito sigue guardado por si quieres terminar la compra.
      </p>
      <Button render={<Link href="/carrito" />} nativeButton={false} className="self-start">
        Volver al carrito
      </Button>
    </main>
  );
}

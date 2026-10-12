// Pagina de exito: aqui vuelve el cliente desde Stripe.
// IMPORTANTE: esta pagina NO confirma el pedido. Solo INFORMA de lo que ya hizo el webhook.
// Si el cliente cierra el navegador en Stripe, nunca llega aqui... y el pedido se confirma igual.
import type { Metadata } from "next";
import Link from "next/link";
import { ResumenPedido } from "@/components/resumen-pedido";
import { VaciarCarrito } from "@/components/vaciar-carrito";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Gracias por tu compra" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function PaginaExito({ searchParams }: Props) {
  const { session_id } = await searchParams;
  // Solo LEEMOS el pedido: nada de update aqui
  const pedido = session_id
    ? await prisma.pedido.findUnique({
        where: { stripeSessionId: session_id },
        include: { lineas: { include: { producto: { select: { nombre: true } } } } },
      })
    : null;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-16">
      {/* Pase lo que pase, el carrito del navegador ya no hace falta */}
      <VaciarCarrito />
      <h1 className="text-3xl font-bold tracking-tight">¡Gracias por tu compra!</h1>
      {!pedido ? (
        <p className="text-muted-foreground">No encontramos ese pedido. Si has pagado, te llegará un email de confirmación.</p>
      ) : (
        <>
          {pedido.estado === "PAGADO" ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800">
              Pago confirmado. Te hemos enviado un email a <strong>{pedido.email}</strong>.
            </p>
          ) : (
            // El webhook aun no ha llegado (o no llegara si esta caido): lo decimos con honestidad
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-800">
              Estamos confirmando tu pago con el banco. Recibirás un email en cuanto esté listo.
            </p>
          )}
          {/* Sin la entrega: esta pagina la abre cualquiera que tenga el session_id */}
          <ResumenPedido
            lineas={pedido.lineas}
            total={pedido.total}
            gastosEnvio={pedido.gastosEnvio}
            envioZona={pedido.envioZona}
            cabecera={<p className="text-sm text-muted-foreground">Pedido #{pedido.id} · estado {pedido.estado}</p>}
          />
        </>
      )}
      <Button render={<Link href="/" />} nativeButton={false} className="self-start">
        Seguir comprando
      </Button>
    </main>
  );
}

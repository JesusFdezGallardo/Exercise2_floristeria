// Detalle de un pedido del cliente. Si no es suyo, 404 (no 403): asi no se revela que ese pedido existe.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeEstado } from "@/components/badge-estado";
import { BloqueEntrega, ResumenPedido } from "@/components/resumen-pedido";
import { puedeVerPedido } from "@/lib/cuentas";
import { entregaDelPedido } from "@/lib/envio";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Pedido #${(await params).id}` };
}

export default async function MiPedido({ params }: Props) {
  const { id: texto } = await params;
  const usuario = await usuarioActual();
  if (!usuario) redirect(`/entrar?callbackUrl=${encodeURIComponent(`/cuenta/pedidos/${texto}`)}`);

  const id = Number(texto);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { lineas: { include: { producto: { select: { nombre: true } } } } },
  });
  if (!pedido || !puedeVerPedido(usuario, pedido)) notFound();
  const entrega = entregaDelPedido(pedido);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <Link href="/cuenta/pedidos" className="text-sm text-muted-foreground hover:text-foreground">← Mis pedidos</Link>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Pedido #{pedido.id}</h1>
        <BadgeEstado estado={pedido.estado} />
      </div>
      <p className="text-sm text-muted-foreground">
        {pedido.creadoEn.toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} · {pedido.email}
      </p>
      <ResumenPedido lineas={pedido.lineas} total={pedido.total} gastosEnvio={pedido.gastosEnvio} envioZona={pedido.envioZona} />
      {entrega && <BloqueEntrega entrega={entrega} />}
    </main>
  );
}

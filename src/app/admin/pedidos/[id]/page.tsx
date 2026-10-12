// Detalle de un pedido en el panel de admin, con los cambios de estado permitidos.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeEstado } from "@/components/badge-estado";
import { CambiarEstado } from "@/components/cambiar-estado";
import { BloqueEntrega, ResumenPedido } from "@/components/resumen-pedido";
import { SinAcceso } from "@/components/sin-acceso";
import { TRANSICIONES_ADMIN } from "@/lib/estados";
import { entregaDelPedido } from "@/lib/envio";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Pedido #${(await params).id} · Admin` };
}

export default async function DetallePedido({ params }: Props) {
  const usuario = await usuarioActual();
  if (!usuario) redirect(`/entrar?callbackUrl=/admin/pedidos/${encodeURIComponent((await params).id)}`);
  if (usuario.rol !== "ADMIN") return <SinAcceso />;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { lineas: { include: { producto: { select: { nombre: true } } } } },
  });
  if (!pedido) notFound();
  const entrega = entregaDelPedido(pedido);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Todos los pedidos</Link>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Pedido #{pedido.id}</h1>
        <BadgeEstado estado={pedido.estado} />
      </div>
      <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
        <dt className="text-muted-foreground">Cliente</dt><dd>{pedido.email}</dd>
        <dt className="text-muted-foreground">Creado</dt><dd>{pedido.creadoEn.toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</dd>
        <dt className="text-muted-foreground">Actualizado</dt><dd>{pedido.actualizadoEn.toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</dd>
        <dt className="text-muted-foreground">Pago en Stripe</dt><dd className="truncate font-mono text-xs">{pedido.stripeSessionId ?? "-"}</dd>
      </dl>
      {/* La floristeria necesita saber adonde llevarlo, a quien y que escribir en la tarjeta */}
      {entrega && <BloqueEntrega entrega={entrega} />}
      <ResumenPedido lineas={pedido.lineas} total={pedido.total} gastosEnvio={pedido.gastosEnvio} envioZona={pedido.envioZona} />
      <CambiarEstado pedidoId={pedido.id} posibles={TRANSICIONES_ADMIN[pedido.estado]} />
    </main>
  );
}

// Mis pedidos: los pedidos de la cuenta que ha entrado, del mas reciente al mas antiguo.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeEstado } from "@/components/badge-estado";
import { Button } from "@/components/ui/button";
import { formatearPrecio } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis pedidos" };

const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "Europe/Madrid" });

export default async function MisPedidos() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?callbackUrl=%2Fcuenta%2Fpedidos"); // cookie caducada o borrada

  const pedidos = await prisma.pedido.findMany({
    where: { usuarioId: usuario.id },
    orderBy: { id: "desc" },
    include: { _count: { select: { lineas: true } } },
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Mis pedidos</h1>
      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Todavía no has hecho ningún pedido.</p>
          <Button render={<Link href="/" />} nativeButton={false}>Ver el catálogo</Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link href={`/cuenta/pedidos/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50">
                <span className="font-medium">#{p.id}</span>
                <span className="flex-1 text-sm text-muted-foreground">
                  {fecha.format(p.creadoEn)} · {p._count.lineas} {p._count.lineas === 1 ? "producto" : "productos"}
                </span>
                <BadgeEstado estado={p.estado} />
                <span className="w-24 text-right font-semibold tabular-nums">{formatearPrecio(p.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

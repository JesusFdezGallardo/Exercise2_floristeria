// Mis avisos: los "avisame cuando vuelva" de la cuenta. Pendientes (con "Quitar") y enviados en los ultimos 30 dias.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QuitarAviso } from "@/components/aviso-reposicion";
import { DIAS_HISTORIAL_AVISOS } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis avisos" };

const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeZone: "Europe/Madrid" });

// Un producto oculto sigue en la lista, pero sin enlace: su ficha da 404
function NombreProducto({ producto }: { producto: { id: number; nombre: string; visible: boolean } }) {
  if (!producto.visible) return <span className="font-medium">{producto.nombre}</span>;
  return (
    <Link href={`/producto/${producto.id}`} className="font-medium underline underline-offset-4">{producto.nombre}</Link>
  );
}

export default async function MisAvisos() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?callbackUrl=%2Fcuenta%2Favisos"); // cookie caducada o borrada

  const desde = new Date(Date.now() - DIAS_HISTORIAL_AVISOS * 24 * 60 * 60 * 1000);
  const avisos = await prisma.avisoReposicion.findMany({
    where: { usuarioId: usuario.id, OR: [{ enviadoEn: null }, { enviadoEn: { gte: desde } }] },
    orderBy: { creadoEn: "desc" },
    include: { producto: { select: { id: true, nombre: true, visible: true } } },
  });
  const pendientes = avisos.filter((a) => a.enviadoEn === null);
  const enviados = avisos.filter((a) => a.enviadoEn !== null);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Mis avisos</h1>
      {avisos.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          No tienes avisos. Cuando un producto esté agotado, pulsa «Avísame cuando vuelva» en su ficha.
        </div>
      ) : (
        <>
          {pendientes.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Pendientes</h2>
              <ul className="flex flex-col divide-y rounded-xl border">
                {pendientes.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <NombreProducto producto={a.producto} />
                    <span className="flex-1 text-sm text-muted-foreground">pedido el {fecha.format(a.creadoEn)}</span>
                    <QuitarAviso productoId={a.producto.id} etiqueta="Quitar" />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {enviados.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Enviados</h2>
              <ul className="flex flex-col divide-y rounded-xl border">
                {enviados.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <NombreProducto producto={a.producto} />
                    <span className="text-sm text-muted-foreground">Te avisamos el {fecha.format(a.enviadoEn!)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

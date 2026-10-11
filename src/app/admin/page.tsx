// Panel de admin: lista de pedidos con filtro por estado (en la URL, como el catalogo).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeEstado } from "@/components/badge-estado";
import { SinAcceso } from "@/components/sin-acceso";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { ESTADOS, ETIQUETA } from "@/lib/estados";
import { formatearPrecio } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Pedidos · Admin" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ estado?: string }> };

const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" });

export default async function PanelPedidos({ searchParams }: Props) {
  // La cookie ya la exige el middleware; aqui se comprueba que la sesion es valida y que el rol es ADMIN
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?callbackUrl=/admin");
  if (usuario.rol !== "ADMIN") return <SinAcceso />;

  const { estado } = await searchParams;
  const filtro = ESTADOS.includes(estado as EstadoPedido) ? (estado as EstadoPedido) : undefined;

  const [pedidos, conteo] = await Promise.all([
    prisma.pedido.findMany({
      where: filtro ? { estado: filtro } : {},
      orderBy: { id: "desc" },
      include: { _count: { select: { lineas: true } } },
    }),
    prisma.pedido.groupBy({ by: ["estado"], _count: true }), // cuantos hay de cada estado
  ]);
  const cuantos = (e: EstadoPedido) => conteo.find((c) => c.estado === e)?._count ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/admin" className={`rounded-full border px-3 py-1 ${!filtro ? "bg-primary text-primary-foreground" : ""}`}>
          Todos ({conteo.reduce((n, c) => n + c._count, 0)})
        </Link>
        {ESTADOS.map((e) => (
          <Link key={e} href={`/admin?estado=${e}`}
            className={`rounded-full border px-3 py-1 ${filtro === e ? "bg-primary text-primary-foreground" : ""}`}>
            {ETIQUETA[e]} ({cuantos(e)})
          </Link>
        ))}
      </div>

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Artículos</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((p) => (
            // Toda la fila abre el pedido: el ::after del enlace se estira sobre la fila (relative). Sin JS en el navegador.
            <TableRow key={p.id} className="relative">
              <TableCell>
                <Link href={`/admin/pedidos/${p.id}`}
                  className="font-medium underline underline-offset-4 after:absolute after:inset-0 after:content-['']">
                  #{p.id}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{fecha.format(p.creadoEn)}</TableCell>
              <TableCell>{p.estado === "PENDIENTE" ? <span className="text-muted-foreground">(sin pagar)</span> : p.email}</TableCell>
              <TableCell><BadgeEstado estado={p.estado} /></TableCell>
              <TableCell className="text-right tabular-nums">{p._count.lineas}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatearPrecio(p.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

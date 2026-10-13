"use server";
// Avisos de reposicion del cliente: pedir y quitar "avisame cuando vuelva". Una Server Action es un endpoint publico:
// cada una comprueba la sesion en la BD y valida el id (puede llegar cualquier cosa, no solo lo del formulario).
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { puedePedirAviso } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

export type EstadoAviso = { ok?: string; error?: string };

const SIN_SESION = "Entra en tu cuenta para pedir el aviso";
const NO_EXISTE = "El producto no existe";

function leerId(datos: FormData): number | null {
  const id = Number(String(datos.get("id") ?? ""));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function refrescar(id: number) {
  revalidatePath(`/producto/${id}`);
  revalidatePath("/cuenta/avisos");
}

export async function pedirAviso(_: EstadoAviso, datos: FormData): Promise<EstadoAviso> {
  const usuario = await usuarioActual();
  if (!usuario) return { error: SIN_SESION };
  const id = leerId(datos);
  if (!id) return { error: NO_EXISTE };

  const producto = await prisma.producto.findUnique({ where: { id }, select: { visible: true, stock: true } });
  if (!producto || !producto.visible) return { error: NO_EXISTE };
  if (!puedePedirAviso(producto)) {
    refrescar(id); // la ficha que tenia abierta estaba desfasada: se vuelve a pintar con el stock
    return { error: "Ya hay stock de este producto" };
  }

  try {
    // Una fila por cliente y producto: si ya se le aviso otra vez, vuelve a quedar pendiente
    await prisma.avisoReposicion.upsert({
      where: { usuarioId_productoId: { usuarioId: usuario.id, productoId: id } },
      create: { usuarioId: usuario.id, productoId: id },
      update: { enviadoEn: null, creadoEn: new Date() },
    });
  } catch (e) {
    // P2002: dos clics a la vez crearon la fila por el otro lado. El aviso ya esta pedido
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  refrescar(id);
  return { ok: "Te avisaremos" };
}

export async function quitarAviso(_: EstadoAviso, datos: FormData): Promise<EstadoAviso> {
  const usuario = await usuarioActual();
  if (!usuario) return { error: SIN_SESION };
  const id = leerId(datos);
  if (!id) return { error: NO_EXISTE };
  // Solo los suyos y pendientes: un aviso ya enviado se queda en su historial
  await prisma.avisoReposicion.deleteMany({ where: { usuarioId: usuario.id, productoId: id, enviadoEn: null } });
  refrescar(id);
  return { ok: "Aviso quitado" };
}

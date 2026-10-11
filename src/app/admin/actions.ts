"use server";
// Server Actions del panel de admin. OJO: una Server Action es un endpoint publico (cualquiera puede llamarla),
// asi que CADA accion vuelve a comprobar el rol en la BD con exigirAdmin(). El middleware solo mira que haya cookie.
import { revalidatePath } from "next/cache";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { puedeCambiar } from "@/lib/estados";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/sesion";

export async function cambiarEstado(pedidoId: number, nuevo: EstadoPedido): Promise<{ error?: string }> {
  // 1. ¿Es admin? (aunque la pagina ya lo compruebe: la accion se puede llamar sin pasar por la pagina)
  if (!(await exigirAdmin())) return { error: "No autorizado" };

  // 2. ¿Es un cambio permitido desde el estado ACTUAL de la base de datos?
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) return { error: "El pedido no existe" };
  if (!puedeCambiar(pedido.estado, nuevo)) return { error: `No se puede pasar de ${pedido.estado} a ${nuevo}` };

  // 3. Guardar y avisar a Next de que esas paginas han cambiado
  await prisma.pedido.update({ where: { id: pedidoId }, data: { estado: nuevo } });
  revalidatePath("/admin");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  return {};
}

"use server";
// Server Actions del panel de admin. OJO: una Server Action es un endpoint publico (cualquiera puede llamarla),
// asi que CADA accion vuelve a comprobar que quien llama es admin. El middleware protege las paginas, no las acciones.
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { COOKIE_ADMIN, esAdmin, huella } from "@/lib/admin";
import { puedeCambiar } from "@/lib/estados";
import { prisma } from "@/lib/prisma";

export async function entrar(_: unknown, datos: FormData): Promise<{ error: string }> {
  const clave = process.env.ADMIN_PASSWORD;
  if (!clave || datos.get("clave") !== clave) return { error: "Contrasena incorrecta" };
  (await cookies()).set(COOKIE_ADMIN, await huella(clave), {
    httpOnly: true, // JavaScript del navegador no puede leerla
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // solo por HTTPS en produccion
    maxAge: 60 * 60 * 8, // 8 horas
    path: "/",
  });
  redirect("/admin");
}

export async function salir() {
  (await cookies()).delete(COOKIE_ADMIN);
  redirect("/admin/entrar");
}

export async function cambiarEstado(pedidoId: number, nuevo: EstadoPedido): Promise<{ error?: string }> {
  // 1. ¿Es admin? (aunque la pagina ya lo compruebe: la accion se puede llamar sin pasar por la pagina)
  if (!(await esAdmin((await cookies()).get(COOKIE_ADMIN)?.value))) return { error: "No autorizado" };

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

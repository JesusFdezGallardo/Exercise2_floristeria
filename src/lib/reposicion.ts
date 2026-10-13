// Gancho de reposicion: el UNICO sitio que sabe que un producto vuelve a poder comprarse. Lo llaman, desde
// src/app/admin/productos/actions.ts, reponerStock y corregirStock (pasa de agotado a disponible: esReposicion)
// y guardarProducto (un producto oculto vuelve a verse con stock: debeAvisarAlGuardar).
// Envia los avisos de "avisame cuando vuelva" (AvisoReposicion), cada uno UNA sola vez:
// 1. Si el producto esta oculto no se avisa (el enlace daria 404): se hara al volver a mostrarlo.
// 2. Los avisos pendientes se reservan con un solo UPDATE ... RETURNING: si dos reposiciones coinciden, cada aviso
//    lo reserva solo una de ellas (no hay emails dobles).
// 3. Se envian por lotes; los de un lote que falla (o sin RESEND_API_KEY) vuelven a pendientes y se reintentan en la
//    siguiente reposicion. Nunca se da por enviado un email que no salio.
import "server-only";
import { enLotes, SIN_AVISOS, TAMANO_LOTE, type ResultadoAvisos } from "@/lib/avisos";
import { enviarAvisosReposicion, type AvisoEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function alReponer(productoId: number, origen: string): Promise<ResultadoAvisos> {
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { nombre: true, precio: true, visible: true, stock: true },
  });
  // stock <= 0: se ha vendido entre medias. No hay nada que avisar
  if (!producto || producto.stock <= 0) return SIN_AVISOS;
  if (!producto.visible) return { ...SIN_AVISOS, oculto: true };

  const reservados = await prisma.$queryRaw<{ id: number; usuarioId: number }[]>`
    UPDATE "AvisoReposicion" SET "enviadoEn" = CURRENT_TIMESTAMP
    WHERE "productoId" = ${productoId} AND "enviadoEn" IS NULL
    RETURNING id, "usuarioId"`;
  if (reservados.length === 0) return SIN_AVISOS;

  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: reservados.map((r) => r.usuarioId) } },
    select: { id: true, email: true, nombre: true },
  });
  const porId = new Map(usuarios.map((u) => [u.id, u]));
  const url = `${origen}/producto/${productoId}`;

  let avisados = 0;
  let fallidos = 0;
  for (const lote of enLotes(reservados, TAMANO_LOTE)) {
    // El usuario siempre existe (borrarlo borra sus avisos en cascada); el flatMap solo contenta al tipo
    const emails: AvisoEmail[] = lote.flatMap((r) => {
      const u = porId.get(r.usuarioId);
      return u ? [{ email: u.email, nombreCliente: u.nombre, nombreProducto: producto.nombre, precio: producto.precio, url }] : [];
    });
    if (await enviarAvisosReposicion(emails)) {
      avisados += lote.length;
    } else {
      fallidos += lote.length;
      await prisma.avisoReposicion.updateMany({ where: { id: { in: lote.map((r) => r.id) } }, data: { enviadoEn: null } });
    }
  }
  console.info(`[reposicion] producto ${productoId}: avisados ${avisados}, fallidos ${fallidos}`);
  return { avisados, fallidos, oculto: false };
}

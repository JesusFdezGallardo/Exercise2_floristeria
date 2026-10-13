// Gancho de reposicion: envia los avisos de "avisame cuando vuelva" (AvisoReposicion) de un producto que se puede
// comprar. Lo llaman, desde src/app/admin/productos/actions.ts, reponerStock y corregirStock siempre que el stock
// queda en positivo, y guardarProducto siempre que el producto queda visible. No solo al pasar de agotado a
// disponible: asi los avisos que fallaron (o que se pidieron justo mientras se reponia) se envian en la siguiente
// operacion. Sin avisos pendientes cuesta una consulta y no hace nada.
// Cada aviso se envia UNA sola vez:
// 1. Si el producto esta oculto o agotado no se avisa (el enlace daria 404, o ya no queda): se hara mas adelante.
// 2. Los avisos pendientes se reservan con un solo UPDATE ... RETURNING: si dos reposiciones coinciden, cada aviso
//    lo reserva solo una de ellas (no hay emails dobles).
// 3. enviarEnLotes (src/lib/avisos.ts) los manda por lotes y devuelve a pendientes los que no salieron, pase lo que
//    pase (lote rechazado, sin RESEND_API_KEY o una excepcion a media). Nunca se da por enviado un email que no salio.
import "server-only";
import { enviarEnLotes, SIN_AVISOS, type ResultadoAvisos } from "@/lib/avisos";
import { enviarAvisosReposicion } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function alReponer(productoId: number, origen: string): Promise<ResultadoAvisos> {
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { nombre: true, precio: true, visible: true, stock: true },
  });
  if (!producto || producto.stock <= 0) return SIN_AVISOS;
  if (!producto.visible) {
    // Solo se le dice al admin si hay alguien esperando
    const esperando = await prisma.avisoReposicion.count({ where: { productoId, enviadoEn: null } });
    return { ...SIN_AVISOS, oculto: esperando > 0 };
  }

  const reservados = await prisma.$queryRaw<{ id: number; usuarioId: number }[]>`
    UPDATE "AvisoReposicion" SET "enviadoEn" = CURRENT_TIMESTAMP
    WHERE "productoId" = ${productoId} AND "enviadoEn" IS NULL
    RETURNING id, "usuarioId"`;
  if (reservados.length === 0) return SIN_AVISOS;

  const url = `${origen}/producto/${productoId}`;
  const { avisados, fallidos } = await enviarEnLotes(
    reservados,
    async (lote) => {
      // Dentro del envio: si esta consulta falla, enviarEnLotes devuelve el lote a pendientes
      const usuarios = await prisma.usuario.findMany({
        where: { id: { in: lote.map((r) => r.usuarioId) } },
        select: { email: true, nombre: true },
      });
      return enviarAvisosReposicion(
        usuarios.map((u) => ({ email: u.email, nombreCliente: u.nombre, nombreProducto: producto.nombre, precio: producto.precio, url })),
      );
    },
    async (ids) => {
      await prisma.avisoReposicion.updateMany({ where: { id: { in: ids } }, data: { enviadoEn: null } });
    },
  );
  console.info(`[reposicion] producto ${productoId}: avisados ${avisados}, fallidos ${fallidos}`);
  return { avisados, fallidos, oculto: false };
}

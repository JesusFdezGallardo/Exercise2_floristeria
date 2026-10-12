// Gancho de reposicion: lo llaman reponerStock y corregirStock (src/app/admin/productos/actions.ts) cuando un producto
// pasa de agotado a disponible (esReposicion). Es el UNICO sitio que sabe que un producto ha vuelto.
// Aqui se enviaran los avisos de "avisame cuando vuelva a haber" (siguiente subproyecto). Por ahora solo deja rastro
// en el log del servidor, que sirve para comprobarlo a mano.
import "server-only";

export async function alReponer(productoId: number): Promise<void> {
  console.info(`[reposicion] el producto ${productoId} vuelve a tener stock`);
}

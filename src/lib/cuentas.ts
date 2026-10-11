// Reglas de las cuentas de cliente: funciones puras, sin BD ni Auth.js, para poder testearlas (tests/cuentas.test.ts).
export type Rol = "CLIENTE" | "ADMIN";

// ¿Este email esta en ADMIN_EMAILS? La lista es la SEMILLA del rol: al entrar, esas cuentas pasan a ADMIN.
// Quitar un email de la lista no quita el rol: lo que manda es Usuario.rol en la BD.
export function esEmailAdmin(email: string, lista: string | undefined): boolean {
  const buscado = email.trim().toLowerCase();
  if (!buscado || !lista) return false;
  return lista
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(buscado);
}

// Un pedido lo ve su dueño o un admin. Los pedidos de antes de las cuentas (sin dueño) solo los ve el admin.
export function puedeVerPedido(usuario: { id: number; rol: Rol }, pedido: { usuarioId: number | null }): boolean {
  return usuario.rol === "ADMIN" || (pedido.usuarioId !== null && pedido.usuarioId === usuario.id);
}

// A donde volver tras entrar: solo rutas de la propia tienda. "//x.com" o "/\x.com" saldrian a otro dominio.
export function destinoSeguro(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return "/";
  return valor;
}

// Auth.js manda a /entrar?error=<codigo> cuando algo falla. Lo contamos en español.
const ERRORES_ENTRADA: Record<string, string> = {
  AccessDenied: "No se pudo entrar con esa cuenta: necesita un email verificado de Google.",
  Configuration: "El acceso con Google no está configurado en este servidor.",
};

export function mensajeErrorEntrada(codigo: string | undefined): string | null {
  if (!codigo) return null;
  return ERRORES_ENTRADA[codigo] ?? "No se pudo entrar con Google. Puede que hayas cancelado el acceso: inténtalo de nuevo.";
}

// Lo que trae la cookie de sesion (session.user), validado. El email sirve para comprobar que el id sigue siendo
// de la misma persona: si se reinician los ids (npm run seed), una cookie vieja podria apuntar a otro usuario.
export function leerSesion(
  user: { id?: string | null; email?: string | null } | null | undefined,
): { id: number; email: string } | null {
  const id = Number(user?.id);
  const email = user?.email?.trim().toLowerCase();
  if (!Number.isInteger(id) || id <= 0 || !email) return null;
  return { id, email };
}

// Reglas de las cuentas de cliente: funciones puras, sin BD ni Node, para poder testearlas (tests/cuentas.test.ts)
// y usarlas tambien en componentes cliente. Lo criptografico esta en src/lib/contrasenas.ts.
export type Rol = "CLIENTE" | "ADMIN";

// Nombre de la cookie de sesion. Aqui (y no en sesion.ts) porque el middleware no puede importar Prisma.
export const COOKIE_SESION = "sesion_rincon";

export const MINIMO_CONTRASENA = 8;
// scrypt con un texto enorme es caro: se corta antes de calcular nada
export const MAXIMO_CONTRASENA = 200;
const MAXIMO_NOMBRE = 80;
// 254 es el maximo de un email. Se mira ANTES del regex: con textos enormes un regex puede tardar minutos (ReDoS)
export const MAXIMO_EMAIL = 254;
// Sin ambiguedad (el dominio son trozos sin puntos separados por un punto): no hay backtracking que explote
const FORMATO_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export type ResultadoRegistro = { ok: true; datos: { nombre: string; email: string } } | { ok: false; error: string };

// Comprueba el formulario de registro y devuelve el PRIMER error, en español, o los datos ya limpios.
export function validarRegistro(d: { nombre: string; email: string; contrasena: string; repetir: string }): ResultadoRegistro {
  const nombre = d.nombre.trim();
  const email = d.email.trim().toLowerCase();
  if (!nombre) return { ok: false, error: "Escribe tu nombre" };
  if (nombre.length > MAXIMO_NOMBRE) return { ok: false, error: "El nombre es demasiado largo" };
  if (email.length > MAXIMO_EMAIL || !FORMATO_EMAIL.test(email)) return { ok: false, error: "Escribe un email válido" };
  if (d.contrasena.length < MINIMO_CONTRASENA) {
    return { ok: false, error: `La contraseña necesita al menos ${MINIMO_CONTRASENA} caracteres` };
  }
  if (d.contrasena.length > MAXIMO_CONTRASENA) {
    return { ok: false, error: `La contraseña es demasiado larga (máximo ${MAXIMO_CONTRASENA} caracteres)` };
  }
  if (d.contrasena !== d.repetir) return { ok: false, error: "Las contraseñas no coinciden" };
  return { ok: true, datos: { nombre, email } };
}

// Un pedido lo ve su dueño o un admin. Los pedidos de antes de las cuentas (sin dueño) solo los ve el admin.
export function puedeVerPedido(usuario: { id: number; rol: Rol }, pedido: { usuarioId: number | null }): boolean {
  return usuario.rol === "ADMIN" || (pedido.usuarioId !== null && pedido.usuarioId === usuario.id);
}

// A donde volver tras entrar: solo rutas de la propia tienda. No basta con mirar el texto: "//x.com", "/\x.com" o
// "/<tab>/x.com" (el navegador quita tabuladores y saltos de linea) saldrian a otro dominio. Por eso se resuelve la URL
// como lo haria el navegador, contra un origen inventado, y se comprueba que no se ha salido de el.
const ORIGEN_PROPIO = "http://tienda.invalid";

export function destinoSeguro(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith("/")) return "/";
  try {
    const url = new URL(valor, ORIGEN_PROPIO);
    if (url.origin !== ORIGEN_PROPIO) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

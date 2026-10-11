// Sesiones propias: un token aleatorio en una cookie httpOnly y su SHA-256 en la tabla Sesion.
// Sustituye a la vieja contraseña compartida del admin. Solo servidor.
import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { huellaToken } from "@/lib/contrasenas";
import { COOKIE_SESION } from "@/lib/cuentas";
import { prisma } from "@/lib/prisma";

const DURACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

// Abre una sesion y pone la cookie. Solo desde una Server Action (un Server Component no puede escribir cookies).
export async function iniciarSesion(usuarioId: number) {
  const token = randomBytes(32).toString("hex");
  const caduca = new Date(Date.now() + DURACION_MS);
  // De paso, limpiamos las sesiones caducadas de este usuario
  await prisma.sesion.deleteMany({ where: { usuarioId, caduca: { lt: new Date() } } });
  await prisma.sesion.create({ data: { id: huellaToken(token), usuarioId, caduca } });
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true, // JavaScript del navegador no puede leerla
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // solo por HTTPS en produccion
    path: "/",
    expires: caduca,
  });
}

// Quien ha entrado, leido de la BD, sin el hash de la contraseña.
// cache(): layout, cabecera y pagina lo piden en la misma peticion, pero se consulta la BD una sola vez.
export const usuarioActual = cache(async () => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) return null;
  const sesion = await prisma.sesion.findUnique({
    where: { id: huellaToken(token) },
    include: { usuario: { omit: { contrasena: true } } },
  });
  if (!sesion || sesion.caduca < new Date()) return null;
  return sesion.usuario;
});

export type UsuarioSesion = NonNullable<Awaited<ReturnType<typeof usuarioActual>>>;

// El rol se lee de la BD en cada peticion: cambiarlo tiene efecto al momento.
// OJO: el middleware solo mira que exista la cookie. Cada pagina y cada accion de admin llama a exigirAdmin().
export async function exigirAdmin() {
  const usuario = await usuarioActual();
  return usuario?.rol === "ADMIN" ? usuario : null;
}

// Cierra la sesion de verdad: se borra la fila (la cookie deja de valer aunque alguien la hubiera copiado)
export async function cerrarSesion() {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_SESION)?.value;
  if (token) await prisma.sesion.deleteMany({ where: { id: huellaToken(token) } });
  almacen.delete(COOKIE_SESION);
}

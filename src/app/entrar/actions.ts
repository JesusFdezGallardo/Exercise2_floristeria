"use server";
// Registro, entrada y salida. Una Server Action es un endpoint publico: todo lo que llega se valida aqui.
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { cifrarContrasena, comprobarContrasena } from "@/lib/contrasenas";
import { MAXIMO_CONTRASENA, MAXIMO_EMAIL, destinoSeguro, validarRegistro } from "@/lib/cuentas";
import { prisma } from "@/lib/prisma";
import { cerrarSesion, iniciarSesion } from "@/lib/sesion";

export type EstadoFormulario = { error: string; valores?: { nombre?: string; email?: string } };

const YA_EXISTE = "Ya hay una cuenta con ese email: entra";
const INCORRECTOS = "Email o contraseña incorrectos";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");

export async function registrarse(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const valores = { nombre: texto(datos, "nombre"), email: texto(datos, "email") };
  const contrasena = texto(datos, "contrasena");
  const r = validarRegistro({ ...valores, contrasena, repetir: texto(datos, "repetir") });
  if (!r.ok) return { error: r.error, valores };

  let usuarioId: number;
  try {
    const usuario = await prisma.usuario.create({
      data: { ...r.datos, contrasena: await cifrarContrasena(contrasena) }, // rol: CLIENTE por defecto
    });
    usuarioId = usuario.id;
  } catch (e) {
    // P2002 = email repetido (@unique). Tambien cubre dos registros a la vez con el mismo email
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: YA_EXISTE, valores };
    throw e;
  }

  await iniciarSesion(usuarioId);
  redirect(destinoSeguro(texto(datos, "destino"))); // fuera del try: redirect funciona lanzando un error especial
}

export async function entrar(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const email = texto(datos, "email").trim().toLowerCase();
  const contrasena = texto(datos, "contrasena");
  const valores = { email: texto(datos, "email") };
  if (!email || email.length > MAXIMO_EMAIL || !contrasena || contrasena.length > MAXIMO_CONTRASENA) {
    return { error: INCORRECTOS, valores };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    // Calculamos un scrypt igualmente: asi un email inexistente tarda lo mismo y no se puede adivinar quien tiene cuenta
    await cifrarContrasena(contrasena);
    return { error: INCORRECTOS, valores };
  }
  if (!(await comprobarContrasena(contrasena, usuario.contrasena))) return { error: INCORRECTOS, valores };

  await iniciarSesion(usuario.id);
  redirect(destinoSeguro(texto(datos, "destino")));
}

export async function salir() {
  await cerrarSesion();
  redirect("/");
}

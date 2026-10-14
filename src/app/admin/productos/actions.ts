"use server";
// Server Actions del admin de productos. OJO: una Server Action es un endpoint publico (cualquiera puede llamarla),
// asi que CADA accion vuelve a comprobar el rol en la BD con exigirAdmin() y valida todo lo que llega.
// El stock solo cambia aqui (reponer y corregir), en el webhook de Stripe (descuenta al pagar) y en el seed.
// Las tres acciones llaman a alReponer cuando el producto se puede comprar (envia los avisos de reposicion pendientes).
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { SIN_AVISOS, textoResultadoAvisos, type ResultadoAvisos } from "@/lib/avisos";
import { normalizar } from "@/lib/busqueda";
import { prisma } from "@/lib/prisma";
import {
  leerUnidades, LIMITES_CORREGIR, LIMITES_REPONER, precioParaEditar, validarProducto, type ErroresProducto,
} from "@/lib/productos-admin";
import { alReponer } from "@/lib/reposicion";
import { exigirAdmin } from "@/lib/sesion";

// Lo que se vuelve a pintar en el formulario de datos (tal como se escribe: el precio como texto)
export type ValoresProducto = { nombre: string; descripcion: string; precio: string; categoriaId: string; visible: boolean };
export type EstadoDatos = { ok?: string; error?: string; errores?: ErroresProducto; valores?: ValoresProducto };
export type EstadoStock = { ok?: string; error?: string };

const NO_AUTORIZADO = "No autorizado: vuelve a entrar con una cuenta de administración";
const NO_EXISTE = "El producto no existe";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");

// El id viaja en un input hidden: lo puede cambiar cualquiera, asi que se valida como lo demas
function leerId(datos: FormData): number | null {
  const id = Number(texto(datos, "id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Paginas que muestran el producto: el admin y la tienda
function refrescar(id: number) {
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}`);
  revalidatePath(`/producto/${id}`);
  revalidatePath("/");
}

// Envia los avisos pendientes del producto. Un fallo aqui (p. ej. la BD) no puede tapar que el stock o los datos
// ya se guardaron: se avisa al admin y los avisos siguen pendientes para la siguiente operacion.
async function avisar(id: number): Promise<ResultadoAvisos> {
  try {
    // El origen, para los enlaces absolutos de los emails (como en crearCheckout)
    const origen = (await headers()).get("origin") ?? "http://localhost:3000";
    return await alReponer(id, origen);
  } catch (e) {
    console.error(`[reposicion] no se pudieron enviar los avisos del producto ${id}:`, e);
    return { ...SIN_AVISOS, error: true };
  }
}

export async function guardarProducto(_: EstadoDatos, datos: FormData): Promise<EstadoDatos> {
  if (!(await exigirAdmin())) return { error: NO_AUTORIZADO };

  const valores: ValoresProducto = {
    nombre: texto(datos, "nombre"),
    descripcion: texto(datos, "descripcion"),
    precio: texto(datos, "precio"),
    categoriaId: texto(datos, "categoriaId"),
    visible: datos.get("visible") === "on",
  };
  const id = leerId(datos);
  if (!id) return { error: NO_EXISTE, valores };

  const r = validarProducto({ ...valores, visible: datos.get("visible") });
  if (!r.ok) return { errores: r.errores, valores };

  const categoria = await prisma.categoria.findUnique({ where: { id: r.datos.categoriaId } });
  if (!categoria) return { errores: { categoriaId: "Elige una categoría de la lista" }, valores };

  // El stock NO se toca aqui. nombreBusqueda se recalcula: si no, el producto renombrado no saldria en la busqueda
  const { count } = await prisma.producto.updateMany({
    where: { id },
    data: { ...r.datos, nombreBusqueda: normalizar(r.datos.nombre) },
  });
  if (count === 0) return { error: NO_EXISTE, valores };

  // Visible: puede haber avisos esperando (se oculto con gente apuntada). alReponer mira el stock por su cuenta
  const avisos = r.datos.visible ? await avisar(id) : SIN_AVISOS;
  refrescar(id);
  const { nombre, descripcion, precio, categoriaId, visible } = r.datos;
  return {
    ok: `Guardado${textoResultadoAvisos(avisos)}`,
    valores: { nombre, descripcion, precio: precioParaEditar(precio), categoriaId: String(categoriaId), visible },
  };
}

export async function reponerStock(_: EstadoStock, datos: FormData): Promise<EstadoStock> {
  if (!(await exigirAdmin())) return { error: NO_AUTORIZADO };
  const id = leerId(datos);
  if (!id) return { error: NO_EXISTE };
  const unidades = leerUnidades(datos.get("unidades"), LIMITES_REPONER);
  if (unidades === null) {
    return { error: `Escribe cuántas unidades han llegado (de ${LIMITES_REPONER.min} a ${LIMITES_REPONER.max})` };
  }

  let nuevo: number;
  try {
    // increment es atomico en la BD: no pisa las ventas que el webhook descuente a la vez
    const producto = await prisma.producto.update({
      where: { id },
      data: { stock: { increment: unidades } },
      select: { stock: true },
    });
    nuevo = producto.stock;
  } catch (e) {
    // P2025 = no existe ese producto
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return { error: NO_EXISTE };
    throw e;
  }

  const antes = nuevo - unidades;
  const avisos = nuevo > 0 ? await avisar(id) : SIN_AVISOS;
  refrescar(id);
  return { ok: `Stock: ${antes} → ${nuevo}${textoResultadoAvisos(avisos)}` };
}

export async function corregirStock(_: EstadoStock, datos: FormData): Promise<EstadoStock> {
  if (!(await exigirAdmin())) return { error: NO_AUTORIZADO };
  const id = leerId(datos);
  // stockLeido = el stock que tenia la pagina al pintarse. Puede ser negativo (sin reserva de stock)
  const leido = Number(texto(datos, "stockLeido"));
  if (!id || texto(datos, "stockLeido") === "" || !Number.isInteger(leido)) return { error: NO_EXISTE };
  const nuevo = leerUnidades(datos.get("stock"), LIMITES_CORREGIR);
  if (nuevo === null) {
    return { error: `Escribe el stock real (de ${LIMITES_CORREGIR.min} a ${LIMITES_CORREGIR.max} unidades)` };
  }

  // Solo se guarda si el stock sigue siendo el que vio el admin: si se vendio algo mientras tanto, no se pisa
  const { count } = await prisma.producto.updateMany({ where: { id, stock: leido }, data: { stock: nuevo } });
  if (count === 0) {
    const actual = await prisma.producto.findUnique({ where: { id }, select: { stock: true } });
    if (!actual) return { error: NO_EXISTE };
    refrescar(id); // la pagina se vuelve a pintar con el stock nuevo (y el campo oculto stockLeido, con el)
    return { error: `El stock ha cambiado mientras editabas: ahora hay ${actual.stock}. Revisa el recuento y guarda otra vez.` };
  }

  const avisos = nuevo > 0 ? await avisar(id) : SIN_AVISOS;
  refrescar(id);
  return { ok: `Stock: ${leido} → ${nuevo}${textoResultadoAvisos(avisos)}` };
}

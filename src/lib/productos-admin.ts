// Reglas del admin de productos: funciones puras, sin BD ni Node, para poder testearlas (tests/productos-admin.test.ts)
// y usarlas tambien en los formularios. Las Server Actions estan en src/app/admin/productos/actions.ts.

export const MAX_NOMBRE = 80;
export const MAX_DESCRIPCION = 1000;
const PRECIO_MINIMO = 50; // centimos: 0,50 EUR
const PRECIO_MAXIMO = 100_000; // centimos: 1.000,00 EUR
export const LIMITES_REPONER = { min: 1, max: 500 };
export const LIMITES_CORREGIR = { min: 0, max: 500 };

// Lo que llega a una Server Action puede ser cualquier cosa: lo que no es texto cuenta como vacio
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Euros con coma o punto y como mucho dos decimales. Cuantificadores acotados: sin backtracking que explote.
// "1.000" no encaja (tres decimales): mejor rechazarlo que guardar 1,00 EUR.
const FORMATO_PRECIO = /^(\d{1,4})(?:[.,](\d{1,2}))?$/;

// "45,90" -> 4590. Sin coma flotante: parte entera y decimales por separado
export function leerPrecio(v: unknown): number | null {
  const t = texto(v);
  if (t.length > 12) return null; // acotar antes del regex
  const m = FORMATO_PRECIO.exec(t.replace("€", "").trim());
  if (!m) return null;
  const centimos = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return centimos >= PRECIO_MINIMO && centimos <= PRECIO_MAXIMO ? centimos : null;
}

// 4590 -> "45,90": como se escribe en el formulario (sin simbolo ni separador de miles, para que leerPrecio lo lea igual)
export function precioParaEditar(centimos: number): string {
  return `${Math.floor(centimos / 100)},${String(centimos % 100).padStart(2, "0")}`;
}

// Unidades de stock: solo cifras (ni signos, ni decimales, ni "1e3")
export function leerUnidades(v: unknown, limites: { min: number; max: number }): number | null {
  const t = texto(v);
  if (!/^\d{1,4}$/.test(t)) return null;
  const n = Number(t);
  return n >= limites.min && n <= limites.max ? n : null;
}

export type CampoProducto = "nombre" | "descripcion" | "precio" | "categoriaId";
export type ErroresProducto = Partial<Record<CampoProducto, string>>;
export type DatosProducto = { nombre: string; descripcion: string; precio: number; categoriaId: number; visible: boolean };

// Orden de los campos en el formulario: el primero con error es al que se lleva el foco
const ORDEN_CAMPOS: CampoProducto[] = ["nombre", "descripcion", "precio", "categoriaId"];
export const primerCampoConErrorProducto = (errores: ErroresProducto): CampoProducto | null =>
  ORDEN_CAMPOS.find((c) => errores[c]) ?? null;

export function validarProducto(
  d: Partial<Record<CampoProducto | "visible", unknown>>,
): { ok: true; datos: DatosProducto } | { ok: false; errores: ErroresProducto } {
  const errores: ErroresProducto = {};

  const nombre = texto(d.nombre);
  if (!nombre) errores.nombre = "Escribe el nombre del producto";
  else if (nombre.length > MAX_NOMBRE) errores.nombre = `El nombre no puede pasar de ${MAX_NOMBRE} caracteres`;

  const descripcion = texto(d.descripcion);
  if (!descripcion) errores.descripcion = "Escribe una descripción";
  else if (descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion = `La descripción no puede pasar de ${MAX_DESCRIPCION} caracteres`;
  }

  const precio = leerPrecio(d.precio);
  if (precio === null) errores.precio = "Escribe un precio entre 0,50 € y 1.000 € (por ejemplo, 45,90)";

  const categoriaTexto = texto(d.categoriaId);
  const categoriaId = /^\d{1,9}$/.test(categoriaTexto) ? Number(categoriaTexto) : 0;
  if (categoriaId <= 0) errores.categoriaId = "Elige una categoría de la lista";

  if (Object.keys(errores).length > 0 || precio === null) return { ok: false, errores };
  // Una casilla marcada llega como "on"; sin marcar, no llega
  return { ok: true, datos: { nombre, descripcion, precio, categoriaId, visible: d.visible === "on" } };
}

// El producto pasa de agotado a disponible. "<= 0" y no "=== 0": sin reserva de stock, dos ventas a la vez de la
// ultima unidad lo dejan en -1 (ver NOTAS, Stock)
export function esReposicion(antes: number, despues: number): boolean {
  return antes <= 0 && despues > 0;
}

// Lista del admin: primero lo que hay que reponer, despues por nombre (con las reglas del español)
export function ordenarParaAdmin<T extends { nombre: string; stock: number }>(productos: T[]): T[] {
  return [...productos].sort((a, b) => Number(a.stock > 0) - Number(b.stock > 0) || a.nombre.localeCompare(b.nombre, "es"));
}

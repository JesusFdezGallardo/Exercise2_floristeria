// Reglas de los avisos de reposicion ("avisame cuando vuelva"). Sin BD ni Resend, para poder probarlas.
// Las usan la ficha del producto, sus Server Actions, el admin de productos y alReponer (src/lib/reposicion.ts).

// Resend acepta como mucho 100 emails por llamada a la API de lotes
export const TAMANO_LOTE = 100;
// "Mis avisos" ensena los avisos ya enviados de los ultimos 30 dias
export const DIAS_HISTORIAL_AVISOS = 30;

export type ResultadoAvisos = { avisados: number; fallidos: number; oculto: boolean };
export const SIN_AVISOS: ResultadoAvisos = { avisados: 0, fallidos: 0, oculto: false };

// Solo se pide aviso de lo que esta a la venta y agotado. Con <= 0: sin reserva de stock puede quedar en -1
export function puedePedirAviso(p: { visible: boolean; stock: number }): boolean {
  return p.visible && p.stock <= 0;
}

// Al guardar los datos: si un producto oculto vuelve a verse y tiene stock, sus avisos pendientes ya se pueden enviar
export function debeAvisarAlGuardar(antes: { visible: boolean }, despues: { visible: boolean; stock: number }): boolean {
  return !antes.visible && despues.visible && despues.stock > 0;
}

export function enLotes<T>(lista: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}

const clientes = (n: number) => `${n} ${n === 1 ? "cliente" : "clientes"}`;

// Lo que se anade al mensaje del admin al reponer, corregir o guardar: " · avisados 3 clientes", o "" si nada
export function textoResultadoAvisos(r: ResultadoAvisos): string {
  if (r.oculto) return " · el producto está oculto: avisaremos cuando lo hagas visible";
  const partes: string[] = [];
  if (r.avisados > 0) partes.push(`${r.avisados === 1 ? "avisado" : "avisados"} ${clientes(r.avisados)}`);
  if (r.fallidos > 0) partes.push(`no se pudo avisar a ${clientes(r.fallidos)} (se reintentará al reponer)`);
  return partes.map((p) => ` · ${p}`).join("");
}

// Junto al stock en el admin
export function textoAvisosPendientes(n: number): string {
  if (n <= 0) return "";
  return n === 1 ? "1 aviso pendiente" : `${n} avisos pendientes`;
}

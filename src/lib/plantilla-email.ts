// Plantilla HTML del email de confirmacion. Va aparte de email.ts (que es "server-only") para poder probarla.
// Tablas y estilos en linea, que es lo que entienden todos los clientes de correo.
// TODO lo que viene de la BD se escapa: la entrega y el mensaje los escribe el cliente.
// Imports relativos y no "@/": Vitest no conoce el alias y tests/email.test.ts carga este archivo
import type { Entrega } from "./envio";
import { formatearPrecio } from "./formato";
import { TIENDA } from "./tienda";

export type LineaEmail = { nombre: string; cantidad: number; precioUnitario: number };
export type PedidoEmail = {
  id: number;
  email: string;
  total: number; // productos + envio
  gastosEnvio: number;
  envioZona: string | null; // null en los pedidos de antes de los envios
  entrega: Entrega | null;
  lineas: LineaEmail[];
};

export function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const fila = (izquierda: string, derecha: string, estilo = "padding:8px 0") =>
  `<tr><td style="${estilo}">${izquierda}</td><td style="${estilo};text-align:right">${derecha}</td></tr>`;

export function plantillaConfirmacion(p: PedidoEmail): string {
  const filas = p.lineas
    .map((l) => fila(`${l.cantidad} × ${escaparHtml(l.nombre)}`, formatearPrecio(l.precioUnitario * l.cantidad)))
    .join("");
  const borde = "padding:12px 0;border-top:1px solid #e5e5e5";
  // Subtotal y envio solo en los pedidos con envio (los antiguos se pintan como antes)
  const envio = p.envioZona
    ? fila("Productos", formatearPrecio(p.total - p.gastosEnvio), borde) +
      fila(`Envío · ${escaparHtml(p.envioZona)}`, p.gastosEnvio === 0 ? "Gratis" : formatearPrecio(p.gastosEnvio))
    : "";
  const e = p.entrega;
  const entrega = e
    ? `<h2 style="font-size:16px;color:#3F6B4A;margin-top:24px">Entrega</h2>
    <p style="margin:0">${escaparHtml(e.nombre)} · ${escaparHtml(e.telefono)}<br>
      ${escaparHtml(e.direccion)}<br>${escaparHtml(e.cp)} ${escaparHtml(e.ciudad)}</p>
    ${e.mensaje ? `<p style="font-style:italic">Tarjeta: «${escaparHtml(e.mensaje)}»</p>` : ""}`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1F2A22">
    <h1 style="font-size:22px;color:#3F6B4A">Gracias por tu compra en ${TIENDA.nombre}</h1>
    <p>Hemos recibido el pago de tu pedido <strong>#${p.id}</strong>. Te avisaremos cuando salga de la tienda.</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e5e5">${filas}${envio}
      ${fila("<strong>Total</strong>", `<strong>${formatearPrecio(p.total)}</strong>`, borde)}
    </table>${entrega}
    <p style="color:#737373;font-size:12px">Tienda ficticia (material de clase). Pago en modo test: no se ha cobrado nada.</p>
  </div>`;
}

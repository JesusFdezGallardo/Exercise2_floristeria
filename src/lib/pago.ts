// Lo que se manda a Stripe Checkout y el total del pedido, sacados de crearCheckout para poder probarlos sin Stripe.
// total = productos + envio: es lo que cobra Stripe (amount_total) y lo que se guarda en Pedido.total.
import type Stripe from "stripe";

type Parametros = Stripe.Checkout.SessionCreateParams;

export type LineaPago = { nombre: string; precio: number; cantidad: number }; // precio en centimos, leido de la BD
export type EnvioPago = { nombre: string; coste: number }; // el envio ya calculado (calcularEnvio)

// Lo que pide el carrito (ids y cantidades) contra los productos leidos de la BD. Devuelve el primer problema, en
// español. Un producto oculto desde el admin se nombra: el carrito lo sigue mostrando y el cliente tiene que saber cual quitar
export function lineasDelCarrito<P extends { id: number; nombre: string; stock: number; visible: boolean }>(
  articulos: { id: number; cantidad: number }[],
  productos: P[],
): { ok: true; lineas: { producto: P; cantidad: number }[] } | { ok: false; error: string } {
  const lineas = [];
  for (const a of articulos) {
    const p = productos.find((x) => x.id === a.id);
    if (!p) return { ok: false, error: "Un producto del carrito ya no existe" };
    if (!p.visible) return { ok: false, error: `${p.nombre} ya no está disponible: quítalo del carrito` };
    if (p.stock < a.cantidad) return { ok: false, error: `Solo quedan ${p.stock} unidades de ${p.nombre}` };
    lineas.push({ producto: p, cantidad: a.cantidad });
  }
  return { ok: true, lineas };
}

export const subtotalDe = (lineas: LineaPago[]) => lineas.reduce((t, l) => t + l.precio * l.cantidad, 0);

export function prepararPago(lineas: LineaPago[], envio: EnvioPago) {
  const lineItems: NonNullable<Parametros["line_items"]> = lineas.map((l) => ({
    quantity: l.cantidad,
    price_data: { currency: "eur", unit_amount: l.precio, product_data: { name: l.nombre } },
  }));
  // Un unico envio, ya calculado: en Stripe el cliente no elige zona (con coste 0, Stripe muestra "Gratis")
  const shippingOptions: NonNullable<Parametros["shipping_options"]> = [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: envio.nombre,
        fixed_amount: { amount: envio.coste, currency: "eur" },
      },
    },
  ];
  return { total: subtotalDe(lineas) + envio.coste, lineItems, shippingOptions };
}

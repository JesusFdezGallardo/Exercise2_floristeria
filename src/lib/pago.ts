// Lo que se manda a Stripe Checkout y el total del pedido, sacados de crearCheckout para poder probarlos sin Stripe.
// total = productos + envio: es lo que cobra Stripe (amount_total) y lo que se guarda en Pedido.total.
import type Stripe from "stripe";

type Parametros = Stripe.Checkout.SessionCreateParams;

export type LineaPago = { nombre: string; precio: number; cantidad: number }; // precio en centimos, leido de la BD
export type EnvioPago = { nombre: string; coste: number }; // el envio ya calculado (calcularEnvio)

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

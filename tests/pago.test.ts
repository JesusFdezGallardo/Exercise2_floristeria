// Lo que se manda a Stripe y el total del pedido: tienen que cuadrar (Stripe cobra lineas + envio).
import { describe, expect, it } from "vitest";
import { prepararPago, subtotalDe } from "../src/lib/pago";

const lineas = [
  { nombre: "Ramo de rosas", precio: 3490, cantidad: 2 },
  { nombre: "Centro de mesa", precio: 2990, cantidad: 1 },
];

describe("prepararPago", () => {
  it("el subtotal suma precio por cantidad en centimos", () => {
    expect(subtotalDe(lineas)).toBe(9970);
    expect(subtotalDe([])).toBe(0);
  });
  it("el total es el subtotal mas el envio", () => {
    expect(prepararPago(lineas, { nombre: "Mensajería 24 h · península", coste: 990 }).total).toBe(10960);
  });
  it("con envio gratis el total es el subtotal", () => {
    expect(prepararPago(lineas, { nombre: "Reparto en Sabadell", coste: 0 }).total).toBe(9970);
  });
  it("manda las lineas a Stripe en centimos y en euros", () => {
    expect(prepararPago(lineas, { nombre: "x", coste: 0 }).lineItems).toEqual([
      { quantity: 2, price_data: { currency: "eur", unit_amount: 3490, product_data: { name: "Ramo de rosas" } } },
      { quantity: 1, price_data: { currency: "eur", unit_amount: 2990, product_data: { name: "Centro de mesa" } } },
    ]);
  });
  it("manda un unico envio ya calculado, con el nombre de la zona", () => {
    expect(prepararPago(lineas, { nombre: "Reparto en Sabadell", coste: 390 }).shippingOptions).toEqual([
      { shipping_rate_data: { type: "fixed_amount", display_name: "Reparto en Sabadell", fixed_amount: { amount: 390, currency: "eur" } } },
    ]);
  });
  it("lo que cobrara Stripe (lineas + envio) es el total que se guarda", () => {
    const { total, lineItems, shippingOptions } = prepararPago(lineas, { nombre: "x", coste: 690 });
    const lineasStripe = lineItems.reduce((t, l) => t + (l.price_data?.unit_amount ?? 0) * (l.quantity ?? 0), 0);
    const envioStripe = shippingOptions[0].shipping_rate_data?.fixed_amount?.amount ?? 0;
    expect(lineasStripe + envioStripe).toBe(total);
  });
});
